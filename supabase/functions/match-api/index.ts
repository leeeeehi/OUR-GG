/**
 * match-api: 친구 전적 피드 / 경기 상세를 위한 Riot API 프록시 Edge Function (KR 서버 전용)
 *
 * - RIOT_API_KEY는 Supabase 시크릿에만 존재하며 브라우저/저장소에 노출되지 않는다.
 * - 응답은 og_riot_cache 테이블에 캐시한다 (레이트 리밋 절약, service_role로만 접근).
 * - service_role은 이 함수 안에서만 쓰며, 조회 권한(팔로우/공개 설정/차단)은 이 함수가 직접 판정한다.
 *
 * 요청: POST { action, ...params }
 *   account       { gameName, tagLine }   Riot ID 존재 확인 -> puuid            (비로그인 허용: 회원가입용)
 *   search        { gameName, tagLine }   소환사 프로필 + 최근 매치 + 앱 유저 여부
 *   userMatches   { userId }              앱 유저의 프로필 + 최근 매치
 *   friendsFeed   {}                      나 + 팔로우한 친구들의 최근 전적 카드
 *   matchDetail   { matchId }             경기 상세(참가자 지표, 팀 합계) + 댓글 가능 여부
 *   leaderboard   {}                      나 + 팔로우한 친구들의 주간 랭킹/24시간 하이라이트
 * 오류: { code, message } + HTTP 상태
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  MAX_FEED_FRIENDS,
  MOCK_PUUID_PREFIX,
  buildLeaderboard,
  formatTier,
  isValidMatchId,
  isValidRiotIdPart,
  isValidUuid,
  summarizeForPuuid,
  toClientMatch,
  trimMatch,
} from './transform.ts';
import type { MatchSummary, TrimmedMatch } from './transform.ts';

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
  matchIds: 90, // 친구 전적 피드가 1~2분 주기로 새로고침되므로 이보다 짧게 유지한다
  match: 60 * 60 * 24 * 365, // 끝난 경기는 바뀌지 않는다
};

const FEED_MATCH_COUNT = 5;
const LIST_MATCH_COUNT = 10;
const MAX_RIOT_IN_FLIGHT = 8;
const FEED_CONCURRENCY = 4;

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

// ---------- 동시성 제어 ----------

// Riot API 동시 호출 수를 제한해 순간적인 초과(429)를 줄인다
let riotInFlight = 0;
const riotWaiters: Array<() => void> = [];

async function withRiotSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (riotInFlight >= MAX_RIOT_IN_FLIGHT) await new Promise<void>((resolve) => riotWaiters.push(resolve));
  riotInFlight++;
  try {
    return await fn();
  } finally {
    riotInFlight--;
    riotWaiters.shift()?.();
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------- Riot API 호출 ----------

// deno-lint-ignore no-explicit-any
async function riotFetch(host: string, path: string): Promise<any> {
  if (!RIOT_API_KEY) {
    throw new ApiError(503, 'RIOT_KEY_MISSING', 'Riot API 키가 설정되지 않았습니다.');
  }

  return await withRiotSlot(async () => {
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
  });
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

function getProfile(puuid: string) {
  return cached(`profile:${puuid}`, TTL.profile, async () => {
    const summoner = await riotFetch(PLATFORM_HOST, `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    const entries = await riotFetch(PLATFORM_HOST, `/lol/league/v4/entries/by-puuid/${puuid}`);
    return {
      summonerLevel: summoner.summonerLevel as number,
      profileIconId: summoner.profileIconId as number,
      ...formatTier(entries),
    };
  });
}

// 캐시 키의 v3는 경기 구조의 버전이다 (v2: 상세 지표 추가, v3: 아레나 서브팀 구분). 예전 구조와 섞이지 않게 분리한다.
function getMatch(matchId: string): Promise<TrimmedMatch> {
  return cached(`match3:${matchId}`, TTL.match, async () => {
    const raw = await riotFetch(REGIONAL_HOST, `/lol/match/v5/matches/${matchId}`);
    try {
      return trimMatch(raw);
    } catch {
      throw new ApiError(502, 'RIOT_UNAVAILABLE', 'Riot 경기 데이터 형식을 해석하지 못했습니다.');
    }
  });
}

async function getRecentMatchSummaries(puuid: string, count: number): Promise<MatchSummary[]> {
  const ids: string[] = await cached(`ids:${puuid}:${count}`, TTL.matchIds, () =>
    riotFetch(REGIONAL_HOST, `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`),
  );
  // 도중에 한도를 넘어도 이미 받은 경기는 캐시에 남아 다음 시도에서 이어서 받는다
  const matches = await Promise.all(ids.map((id) => getMatch(id)));
  return matches.map((m) => summarizeForPuuid(m, puuid)).filter((m): m is MatchSummary => m !== null);
}

// ---------- 앱 유저 / 공개 범위 ----------

interface AppUser {
  id: string;
  nickname: string;
  profile_image_url: string | null;
  riot_game_name: string;
  riot_tag_line: string;
  puuid: string;
  deleted_at: string | null;
}

const APP_USER_COLUMNS = 'id, nickname, profile_image_url, riot_game_name, riot_tag_line, puuid, deleted_at';

const isLinked = (u: AppUser) => Boolean(u.puuid) && !u.puuid.startsWith(MOCK_PUUID_PREFIX);

async function loadUsersByIds(ids: string[]): Promise<AppUser[]> {
  if (ids.length === 0) return [];
  const { data } = await admin.from('og_users').select(APP_USER_COLUMNS).in('id', ids);
  return (data ?? []) as AppUser[];
}

async function loadUsersByPuuids(puuids: string[]): Promise<AppUser[]> {
  if (puuids.length === 0) return [];
  const { data } = await admin.from('og_users').select(APP_USER_COLUMNS).in('puuid', puuids).is('deleted_at', null);
  return (data ?? []) as AppUser[];
}

/** 나와 차단 관계(어느 쪽이든)인 유저 id 집합 */
async function loadBlockedIds(me: string): Promise<Set<string>> {
  const { data } = await admin.from('og_blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${me},blocked_id.eq.${me}`);
  const ids = new Set<string>();
  for (const row of data ?? []) ids.add(row.blocker_id === me ? row.blocked_id : row.blocker_id);
  return ids;
}

/** "내 전적을 공개" 설정을 끈 유저 id 집합 */
async function loadShareOffIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await admin.from('og_user_settings').select('user_id').in('user_id', ids).eq('share_matches', false);
  return new Set((data ?? []).map((row) => row.user_id as string));
}

async function loadFollowingIds(me: string, limit?: number): Promise<string[]> {
  let query = admin.from('og_follows').select('following_id').eq('follower_id', me).order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []).map((row) => row.following_id as string);
}

const userBrief = (u: AppUser) => ({
  userId: u.id,
  nickname: u.nickname,
  profileImageUrl: u.profile_image_url,
  riotGameName: u.riot_game_name,
  riotTagLine: u.riot_tag_line,
});

/** 경기와 우리 앱 유저의 연결을 기록한다 (댓글 접근 권한 판정과 알림 대상에 쓰인다) */
async function linkMatchPlayers(rows: Array<{ match_id: string; user_id: string }>) {
  if (rows.length === 0) return;
  const { error } = await admin.from('og_match_players').upsert(rows, {
    onConflict: 'match_id,user_id',
    ignoreDuplicates: true,
  });
  if (error) console.error('link match players failed:', error.code);
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

async function handleSearch(body: Body, me: string) {
  const { gameName, tagLine } = requireRiotId(body);
  const account = await getAccount(gameName, tagLine);
  const [owner] = await loadUsersByPuuids([account.puuid]);

  // 우리 앱 유저의 Riot ID라면 그 유저의 공개 설정/차단을 존중한다
  let hidden = false;
  if (owner && owner.id !== me) {
    const [blocked, shareOff] = await Promise.all([loadBlockedIds(me), loadShareOffIds([owner.id])]);
    hidden = blocked.has(owner.id) || shareOff.has(owner.id);
  }

  const profile = await getProfile(account.puuid);
  let recentMatches: MatchSummary[] = [];
  if (!hidden) {
    recentMatches = await getRecentMatchSummaries(account.puuid, LIST_MATCH_COUNT);
    if (owner) await linkMatchPlayers(recentMatches.map((m) => ({ match_id: m.matchId, user_id: owner.id })));
  }

  return {
    profile: { ...account, ...profile },
    recentMatches,
    hidden,
    owner: owner ? { userId: owner.id, nickname: owner.nickname, profileImageUrl: owner.profile_image_url } : null,
  };
}

async function handleUserMatches(body: Body, me: string) {
  if (!isValidUuid(body.userId)) throw new ApiError(400, 'BAD_REQUEST', '올바르지 않은 유저입니다.');

  const [target] = await loadUsersByIds([body.userId]);
  if (!target || target.deleted_at) throw new ApiError(404, 'USER_NOT_FOUND', '존재하지 않는 사용자입니다.');
  if (!isLinked(target)) throw new ApiError(409, 'RIOT_ID_NOT_LINKED', '아직 Riot ID를 연동하지 않은 사용자입니다.');

  if (target.id !== me) {
    const [blocked, shareOff] = await Promise.all([loadBlockedIds(me), loadShareOffIds([target.id])]);
    if (blocked.has(target.id) || shareOff.has(target.id)) {
      return { user: userBrief(target), profile: null, recentMatches: [], hidden: true };
    }
  }

  const [profile, recentMatches] = await Promise.all([
    getProfile(target.puuid),
    getRecentMatchSummaries(target.puuid, LIST_MATCH_COUNT),
  ]);
  await linkMatchPlayers(recentMatches.map((m) => ({ match_id: m.matchId, user_id: target.id })));
  return { user: userBrief(target), profile, recentMatches, hidden: false };
}

/** 나 + 팔로우한 친구 중 전적을 볼 수 있는 사람들 (차단/비공개/탈퇴/미연동 제외) */
async function loadFeedUsers(me: string) {
  const followingIds = await loadFollowingIds(me, MAX_FEED_FRIENDS);
  const [users, blocked, shareOff] = await Promise.all([
    loadUsersByIds([me, ...followingIds]),
    loadBlockedIds(me),
    loadShareOffIds(followingIds),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));

  const visible = (id: string) => {
    const u = byId.get(id);
    return u && !u.deleted_at && isLinked(u) && !blocked.has(id) && !shareOff.has(id) ? u : null;
  };

  const meUser = byId.get(me);
  const friends = followingIds.map(visible).filter((u): u is AppUser => u !== null);
  return {
    me: meUser && !meUser.deleted_at && isLinked(meUser) ? meUser : null,
    friends,
    followingCount: followingIds.length,
    hiddenCount: followingIds.length - friends.length,
  };
}

async function handleFriendsFeed(me: string) {
  const { me: meUser, friends, followingCount, hiddenCount } = await loadFeedUsers(me);
  const targets = [...(meUser ? [meUser] : []), ...friends];

  const cards = await mapWithConcurrency(targets, FEED_CONCURRENCY, async (u) => {
    try {
      const recentMatches = await getRecentMatchSummaries(u.puuid, FEED_MATCH_COUNT);
      await linkMatchPlayers(recentMatches.map((m) => ({ match_id: m.matchId, user_id: u.id })));
      return { ...userBrief(u), isMe: u.id === me, status: 'ok', code: null, recentMatches, lastMatchAt: recentMatches[0]?.gameCreation ?? 0 };
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'INTERNAL';
      return { ...userBrief(u), isMe: u.id === me, status: 'error', code, recentMatches: [] as MatchSummary[], lastMatchAt: 0 };
    }
  });

  // 키 문제로 전부 실패했다면 카드 대신 오류를 그대로 알려준다
  const keyProblem = cards.find((c) => c.code === 'RIOT_KEY_INVALID' || c.code === 'RIOT_KEY_MISSING');
  if (cards.length > 0 && keyProblem && cards.every((c) => c.status === 'error')) {
    throw new ApiError(503, keyProblem.code as string, 'Riot API 키가 만료되었거나 설정되지 않았습니다.');
  }

  // 내 카드를 맨 위에, 친구는 최근에 플레이한 순서로
  const sorted = [
    ...cards.filter((c) => c.isMe),
    ...cards.filter((c) => !c.isMe).sort((a, b) => b.lastMatchAt - a.lastMatchAt),
  ];
  return { cards: sorted, followingCount, hiddenCount };
}

async function handleMatchDetail(body: Body, me: string) {
  if (!isValidMatchId(body.matchId)) throw new ApiError(400, 'BAD_REQUEST', '올바르지 않은 경기입니다.');
  const match = await getMatch(body.matchId);

  const appUsers = await loadUsersByPuuids(match.participants.map((p) => p.puuid));
  const appUserIds = appUsers.map((u) => u.id);
  const [blocked, shareOff, followingIds] = await Promise.all([
    loadBlockedIds(me),
    loadShareOffIds(appUserIds),
    appUserIds.length > 0
      ? admin.from('og_follows').select('following_id').eq('follower_id', me).in('following_id', appUserIds)
      : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
  ]);
  const following = new Set((followingIds.data ?? []).map((row) => row.following_id));

  const hiddenFromMe = (u: AppUser) => u.id !== me && (blocked.has(u.id) || shareOff.has(u.id));
  // 이 경기의 앱 유저가 모두 나에게 비공개라면 경기 상세도 열지 않는다
  if (appUsers.length > 0 && appUsers.every(hiddenFromMe)) {
    throw new ApiError(403, 'MATCH_HIDDEN', '비공개 처리된 경기입니다.');
  }

  await linkMatchPlayers(appUsers.map((u) => ({ match_id: match.matchId, user_id: u.id })));

  const visibleUsers = appUsers.filter((u) => !hiddenFromMe(u));
  const userIdsByPuuid: Record<string, string> = {};
  for (const u of visibleUsers) userIdsByPuuid[u.puuid] = u.id;

  // og_can_view_match 규칙과 동일: 내가 참가했거나, 팔로우한 (공개 중인) 참가자가 있을 때 댓글/리액션 가능
  const viewerIsPlayer = appUsers.some((u) => u.id === me);
  const canInteract = viewerIsPlayer || visibleUsers.some((u) => following.has(u.id));

  return {
    match: toClientMatch(match, userIdsByPuuid),
    appUsers: visibleUsers.map((u) => ({ userId: u.id, nickname: u.nickname, profileImageUrl: u.profile_image_url })),
    viewerIsPlayer,
    canInteract,
  };
}

async function handleLeaderboard(me: string) {
  const { me: meUser, friends, followingCount, hiddenCount } = await loadFeedUsers(me);
  const targets = [...(meUser ? [meUser] : []), ...friends];

  const settled = await mapWithConcurrency(targets, FEED_CONCURRENCY, async (u) => {
    try {
      const matches = await getRecentMatchSummaries(u.puuid, LIST_MATCH_COUNT);
      return { userId: u.id, nickname: u.nickname, profileImageUrl: u.profile_image_url, matches };
    } catch {
      return null;
    }
  });
  const entries = settled.filter((e): e is NonNullable<typeof e> => e !== null);

  return {
    ...buildLeaderboard(entries, Date.now()),
    followingCount,
    hiddenCount,
    failedCount: targets.length - entries.length,
  };
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
        return jsonResponse(await handleSearch(body, user.id), 200, origin);
      case 'userMatches':
        return jsonResponse(await handleUserMatches(body, user.id), 200, origin);
      case 'friendsFeed':
        return jsonResponse(await handleFriendsFeed(user.id), 200, origin);
      case 'matchDetail':
        return jsonResponse(await handleMatchDetail(body, user.id), 200, origin);
      case 'leaderboard':
        return jsonResponse(await handleLeaderboard(user.id), 200, origin);
      default:
        throw new ApiError(400, 'BAD_REQUEST', '지원하지 않는 요청입니다.');
    }
  } catch (e) {
    if (e instanceof ApiError) {
      const extra = e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {};
      return jsonResponse({ code: e.code, message: e.message }, e.status, origin, extra);
    }
    console.error('match-api unexpected error:', e instanceof Error ? e.name : 'unknown');
    return jsonResponse({ code: 'INTERNAL', message: '서버 오류가 발생했습니다.' }, 500, origin);
  }
});
