/**
 * riot-proxy: Riot Games API 프록시 Edge Function (KR 서버 전용)
 *
 * - RIOT_API_KEY는 Supabase 시크릿에만 존재하며 브라우저/저장소에 노출되지 않는다.
 * - 응답은 og_riot_cache 테이블에 캐시한다 (레이트 리밋 절약, service_role로만 접근).
 * - 게시물 등록(createPost)은 Riot 원본 데이터로 서버가 직접 저장해 전적 수치 위조를 막는다.
 *
 * 요청: POST { action, ...params }
 *   account       { gameName, tagLine }              Riot ID 존재 확인 -> puuid   (비로그인 허용: 회원가입용)
 *   search        { gameName, tagLine }              프로필 + 최근 매치            (로그인 필요)
 *   recentMatches { puuid, count? }                  최근 매치 요약                (로그인 필요)
 *   createPost    { matchId, caption?, visibility }  내 경기를 게시물로 등록        (로그인 필요)
 * 오류: { code, message } + HTTP 상태 (code 예: RIOT_NOT_FOUND, RIOT_RATE_LIMITED, RIOT_KEY_INVALID ...)
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  MOCK_PUUID_PREFIX,
  VISIBILITIES,
  buildPostRow,
  formatTier,
  isValidMatchId,
  isValidPuuid,
  isValidRiotIdPart,
  sanitizeCaption,
  summarizeForPuuid,
  trimMatch,
} from './transform.ts';
import type { TrimmedMatch } from './transform.ts';

const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const REGIONAL_HOST = 'asia.api.riotgames.com'; // account-v1, match-v5 (KR은 asia 라우팅)
const PLATFORM_HOST = 'kr.api.riotgames.com'; // summoner-v4, league-v4

const TTL = {
  account: 60 * 60 * 24,
  accountNotFound: 60 * 5,
  profile: 60 * 10,
  matchIds: 60 * 2,
  match: 60 * 60 * 24 * 365, // 끝난 경기는 바뀌지 않는다
};

const POST_SELECT = '*, author:og_users!og_posts_user_id_fkey(id, nickname, profile_image_url, tier, rank)';

// service_role 클라이언트는 이 함수 안에서만 쓰며 클라이언트에 전달되지 않는다
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

class ApiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

// ---------- HTTP 공통 ----------

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin === 'https://leeeeehi.github.io') return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigin(origin);
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': allowed, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin), ...extra },
  });
}

async function getUser(req: Request) {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : data.user;
}

// ---------- Riot API 호출 ----------

// deno-lint-ignore no-explicit-any
async function riotFetch(host: string, path: string): Promise<any> {
  if (!RIOT_API_KEY) {
    throw new ApiError(503, 'RIOT_KEY_MISSING', 'Riot API 키가 설정되지 않았습니다.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://${host}${path}`, {
      headers: { 'X-Riot-Token': RIOT_API_KEY },
      signal: controller.signal,
    });
    if (res.ok) return await res.json();
    if (res.status === 404) throw new ApiError(404, 'RIOT_NOT_FOUND', '대상을 찾을 수 없습니다.');
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After')) || undefined;
      throw new ApiError(429, 'RIOT_RATE_LIMITED', 'Riot API 요청 한도를 초과했습니다.', retryAfter);
    }
    if (res.status === 401 || res.status === 403) {
      throw new ApiError(503, 'RIOT_KEY_INVALID', 'Riot API 키가 만료되었거나 올바르지 않습니다.');
    }
    throw new ApiError(502, 'RIOT_UNAVAILABLE', `Riot API 오류 (${res.status})`);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(502, 'RIOT_UNAVAILABLE', 'Riot API에 연결하지 못했습니다.');
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 캐시 ----------

async function saveCache(key: string, payload: unknown, ttlSeconds: number) {
  const { error } = await admin.from('og_riot_cache').upsert({
    cache_key: key,
    payload,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  });
  if (error) console.error('cache write failed:', error.code);
}

/**
 * 캐시가 신선하면 그대로 반환하고, 아니면 loader로 새로 가져와 저장한다.
 * Riot 장애/키 만료/한도 초과 시에는 만료된 캐시라도 있으면 그 값으로 응답한다.
 */
async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  notFoundTtlSeconds = 0,
): Promise<T> {
  const { data: row } = await admin
    .from('og_riot_cache')
    .select('payload, expires_at')
    .eq('cache_key', key)
    .maybeSingle();

  const isMissingMarker = row?.payload?.__notFound === true;
  if (row && new Date(row.expires_at).getTime() > Date.now()) {
    if (isMissingMarker) throw new ApiError(404, 'RIOT_NOT_FOUND', '대상을 찾을 수 없습니다.');
    return row.payload as T;
  }

  try {
    const fresh = await loader();
    await saveCache(key, fresh, ttlSeconds);
    return fresh;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'RIOT_NOT_FOUND') {
      if (notFoundTtlSeconds > 0) await saveCache(key, { __notFound: true }, notFoundTtlSeconds);
      throw e;
    }
    if (e instanceof ApiError && row && !isMissingMarker) return row.payload as T;
    throw e;
  }
}

function cleanupExpiredCache() {
  // 가끔씩만 만료된 행을 지운다 (응답을 지연시키지 않도록 기다리지 않음)
  if (Math.random() < 0.02) {
    admin.from('og_riot_cache').delete().lt('expires_at', new Date().toISOString()).then(() => {});
  }
}

// ---------- Riot 데이터 조회 ----------

function getAccount(gameName: string, tagLine: string) {
  const key = `account:${gameName.trim().toLowerCase()}#${tagLine.trim().toLowerCase()}`;
  return cached(
    key,
    TTL.account,
    async () => {
      const r = await riotFetch(
        REGIONAL_HOST,
        `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(tagLine.trim())}`,
      );
      return { puuid: r.puuid as string, gameName: r.gameName as string, tagLine: r.tagLine as string };
    },
    TTL.accountNotFound,
  );
}

// deno-lint-ignore no-explicit-any
async function loadLeagueEntries(puuid: string, summoner: any) {
  try {
    return await riotFetch(PLATFORM_HOST, `/lol/league/v4/entries/by-puuid/${puuid}`);
  } catch (e) {
    // by-puuid 조회를 지원하지 않는 경우에만 구 방식(summoner id)으로 한 번 더 시도한다
    if (e instanceof ApiError && e.code === 'RIOT_NOT_FOUND') {
      if (summoner?.id) return await riotFetch(PLATFORM_HOST, `/lol/league/v4/entries/by-summoner/${summoner.id}`);
      return [];
    }
    throw e;
  }
}

function getProfile(puuid: string) {
  return cached(`profile:${puuid}`, TTL.profile, async () => {
    const summoner = await riotFetch(PLATFORM_HOST, `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    const entries = await loadLeagueEntries(puuid, summoner);
    return {
      summonerLevel: summoner.summonerLevel as number,
      profileIconId: summoner.profileIconId as number,
      ...formatTier(entries),
    };
  });
}

function getMatch(matchId: string): Promise<TrimmedMatch> {
  return cached(`match:${matchId}`, TTL.match, async () => {
    const raw = await riotFetch(REGIONAL_HOST, `/lol/match/v5/matches/${matchId}`);
    try {
      return trimMatch(raw);
    } catch {
      throw new ApiError(502, 'RIOT_UNAVAILABLE', 'Riot 경기 데이터 형식을 해석하지 못했습니다.');
    }
  });
}

async function getRecentMatchSummaries(puuid: string, count: number) {
  const ids: string[] = await cached(`ids:${puuid}:${count}`, TTL.matchIds, () =>
    riotFetch(REGIONAL_HOST, `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`),
  );
  // 도중에 한도를 넘어도 이미 받은 경기는 캐시에 남아 다음 시도에서 이어서 받는다
  const matches = await Promise.all(ids.map((id) => getMatch(id)));
  return matches.map((m) => summarizeForPuuid(m, puuid)).filter((m) => m !== null);
}

// ---------- 액션 ----------

// deno-lint-ignore no-explicit-any
type Body = Record<string, any>;

function requireRiotId(body: Body) {
  if (!isValidRiotIdPart(body.gameName, 32) || !isValidRiotIdPart(body.tagLine, 10)) {
    throw new ApiError(400, 'BAD_REQUEST', '소환사명과 태그를 올바르게 입력해주세요.');
  }
  return { gameName: body.gameName as string, tagLine: body.tagLine as string };
}

async function handleAccount(body: Body) {
  const { gameName, tagLine } = requireRiotId(body);
  return await getAccount(gameName, tagLine);
}

async function handleSearch(body: Body) {
  const { gameName, tagLine } = requireRiotId(body);
  const account = await getAccount(gameName, tagLine);
  const [profile, recentMatches] = await Promise.all([
    getProfile(account.puuid),
    getRecentMatchSummaries(account.puuid, 10),
  ]);
  return { profile: { ...account, ...profile }, recentMatches };
}

async function handleRecentMatches(body: Body) {
  if (!isValidPuuid(body.puuid)) throw new ApiError(400, 'BAD_REQUEST', '올바르지 않은 puuid입니다.');
  const count = Math.min(Math.max(Number(body.count) || 10, 1), 10);
  return { matches: await getRecentMatchSummaries(body.puuid, count) };
}

async function handleCreatePost(body: Body, userId: string) {
  if (!isValidMatchId(body.matchId)) throw new ApiError(400, 'BAD_REQUEST', '올바르지 않은 매치입니다.');
  const visibility = VISIBILITIES.includes(body.visibility) ? (body.visibility as string) : 'public';
  const caption = sanitizeCaption(body.caption);

  const { data: me } = await admin
    .from('og_users')
    .select('puuid, deleted_at')
    .eq('id', userId)
    .maybeSingle();
  if (!me || me.deleted_at) throw new ApiError(403, 'PROFILE_REQUIRED', '프로필이 필요합니다.');
  if (me.puuid.startsWith(MOCK_PUUID_PREFIX)) {
    throw new ApiError(409, 'RIOT_ID_NOT_LINKED', '설정에서 실제 Riot ID를 연동해주세요.');
  }

  const match = await getMatch(body.matchId);
  if (!match.participants.some((p) => p.puuid === me.puuid)) {
    throw new ApiError(403, 'NOT_YOUR_MATCH', '내가 참가한 경기만 공유할 수 있습니다.');
  }

  const { data, error } = await admin
    .from('og_posts')
    .insert(buildPostRow(userId, match, me.puuid, caption, visibility))
    .select(POST_SELECT)
    .single();
  if (error?.code === '23505') throw new ApiError(409, 'DUPLICATE_MATCH', '이미 등록한 매치입니다.');
  if (error) throw new ApiError(500, 'INTERNAL', '게시물을 저장하지 못했습니다.');
  return { post: data };
}

// ---------- 진입점 ----------

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'POST만 지원합니다.' }, 405, origin);

  try {
    const body: Body | null = await req.json().catch(() => null);
    if (!body || typeof body.action !== 'string') {
      throw new ApiError(400, 'BAD_REQUEST', '요청 형식이 올바르지 않습니다.');
    }

    cleanupExpiredCache();

    if (body.action === 'account') {
      return jsonResponse(await handleAccount(body), 200, origin);
    }

    const user = await getUser(req);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    switch (body.action) {
      case 'search':
        return jsonResponse(await handleSearch(body), 200, origin);
      case 'recentMatches':
        return jsonResponse(await handleRecentMatches(body), 200, origin);
      case 'createPost':
        return jsonResponse(await handleCreatePost(body, user.id), 200, origin);
      default:
        throw new ApiError(400, 'BAD_REQUEST', '지원하지 않는 요청입니다.');
    }
  } catch (e) {
    if (e instanceof ApiError) {
      const extra = e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {};
      return jsonResponse({ code: e.code, message: e.message }, e.status, origin, extra);
    }
    console.error('riot-proxy unexpected error:', e instanceof Error ? e.name : 'unknown');
    return jsonResponse({ code: 'INTERNAL', message: '서버 오류가 발생했습니다.' }, 500, origin);
  }
});
