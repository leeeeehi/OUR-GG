/**
 * Riot API 클라이언트. 브라우저에서 Riot API를 직접 호출할 수 없으므로(키 노출/CORS)
 * Supabase Edge Function(riot-proxy)을 통해서만 호출한다. Riot API 키는 서버 시크릿에만 있다.
 */
import { supabase } from './supabase';

const FUNCTION_NAME = 'riot-proxy';
const MOCK_PUUID_PREFIX = 'mock-puuid-';

const ERROR_MESSAGES = {
  RIOT_NOT_FOUND: '존재하지 않는 Riot ID입니다. 소환사명과 태그를 확인해주세요.',
  RIOT_RATE_LIMITED: '요청이 많아 잠시 후 다시 시도해주세요.',
  RIOT_KEY_MISSING: 'Riot 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
  RIOT_KEY_INVALID: 'Riot 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
  RIOT_UNAVAILABLE: 'Riot 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
  RIOT_ID_NOT_LINKED: '설정에서 실제 Riot ID를 먼저 연동해주세요.',
  NOT_YOUR_MATCH: '내가 참가한 경기만 공유할 수 있습니다.',
  DUPLICATE_MATCH: '이미 등록한 매치입니다.',
  PROFILE_REQUIRED: '프로필 정보가 필요합니다.',
  BAD_REQUEST: '요청 정보가 올바르지 않습니다.',
};

export class RiotApiError extends Error {
  /**
   * @param {string} code - 오류 코드 (예: RIOT_NOT_FOUND) [Required]
   * @param {string} message - 서버가 내려준 메시지 [Optional]
   */
  constructor(code, message) {
    super(message ?? code);
    this.name = 'RiotApiError';
    this.code = code;
  }
}

/**
 * 오류 코드에 맞는 사용자용 한국어 문구를 반환한다.
 * @param {{ code?: string }} error - RiotApiError 또는 { code } 형태 [Required]
 * @param {string} fallback - 매핑이 없을 때 쓸 문구 [Optional]
 */
export function getRiotErrorMessage(error, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.') {
  const code = error?.code ?? '';
  if (code.startsWith('UNAUTHORIZED')) return '로그인이 필요합니다. 다시 로그인해주세요.';
  return ERROR_MESSAGES[code] ?? fallback;
}

/** 실제 Riot puuid로 연동되지 않은(예전 목업 단계에서 가입한) 계정인지 여부 */
export function isMockPuuid(puuid) {
  return typeof puuid === 'string' && puuid.startsWith(MOCK_PUUID_PREFIX);
}

async function invokeRiot(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: { action, ...payload } });
  if (!error) return data;

  let code = 'RIOT_UNAVAILABLE';
  let message;
  try {
    const body = await error.context.json();
    if (body?.code) code = body.code;
    message = body?.message;
  } catch {
    // 응답 본문을 읽을 수 없으면(네트워크 오류 등) 기본 코드를 그대로 사용한다
  }
  throw new RiotApiError(code, message);
}

/**
 * Riot ID가 실제로 존재하는지 확인하고 puuid와 정식 표기(대소문자)를 돌려준다.
 * @param {string} gameName - 소환사명 [Required]
 * @param {string} tagLine - 태그 [Required]
 * @returns {Promise<{ puuid: string, gameName: string, tagLine: string }>}
 */
export function lookupRiotId(gameName, tagLine) {
  return invokeRiot('account', { gameName, tagLine });
}

/**
 * 소환사명#태그로 프로필(레벨/티어)과 최근 매치를 조회한다. (로그인 필요)
 * @returns {Promise<{ profile: object, recentMatches: Array<object> }>}
 */
export function searchSummoner(gameName, tagLine) {
  return invokeRiot('search', { gameName, tagLine });
}

/**
 * @param {string} puuid - 조회할 소환사 puuid [Required]
 * @param {number} count - 가져올 매치 수 (최대 10) [Optional, 기본값: 10]
 */
export async function getRecentMatches(puuid, count = 10) {
  const { matches } = await invokeRiot('recentMatches', { puuid, count });
  return matches;
}

/**
 * 내가 참가한 경기를 게시물로 등록한다. 전적 수치는 서버가 Riot 원본으로 저장한다.
 * @param {object} params - { matchId, caption, visibility } [Required]
 */
export async function createPostFromMatch({ matchId, caption, visibility }) {
  const { post } = await invokeRiot('createPost', { matchId, caption, visibility });
  return post;
}
