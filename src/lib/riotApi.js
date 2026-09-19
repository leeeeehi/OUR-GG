/**
 * 전적 API 클라이언트. 브라우저에서 Riot API를 직접 호출할 수 없으므로(키 노출/CORS)
 * Supabase Edge Function(match-api)을 통해서만 호출한다. Riot API 키는 서버 시크릿에만 있다.
 * 팔로우/공개 설정/차단에 따른 조회 권한 판정도 서버에서 이루어진다.
 */
import { supabase } from './supabase';

const FUNCTION_NAME = 'match-api';
const MOCK_PUUID_PREFIX = 'mock-puuid-';

const RIOT_UNAVAILABLE_MESSAGE = 'Riot 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.';

const ERROR_MESSAGES = {
  RIOT_NOT_FOUND: '존재하지 않는 Riot ID입니다. 소환사명과 태그를 확인해주세요.',
  RIOT_RATE_LIMITED: '요청이 많아 잠시 후 다시 시도해주세요.',
  RIOT_KEY_MISSING: RIOT_UNAVAILABLE_MESSAGE,
  RIOT_KEY_INVALID: RIOT_UNAVAILABLE_MESSAGE,
  RIOT_UNAVAILABLE: RIOT_UNAVAILABLE_MESSAGE,
  RIOT_ID_NOT_LINKED: '아직 Riot ID를 연동하지 않은 사용자입니다.',
  MATCH_HIDDEN: '비공개 처리된 경기입니다.',
  USER_NOT_FOUND: '존재하지 않는 사용자입니다.',
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
 * Riot ID가 실제로 존재하는지 확인하고 puuid와 정식 표기(대소문자)를 돌려준다. (가입용, 비로그인 허용)
 * @param {string} gameName - 소환사명 [Required]
 * @param {string} tagLine - 태그 [Required]
 * @returns {Promise<{ puuid: string, gameName: string, tagLine: string }>}
 */
export function lookupRiotId(gameName, tagLine) {
  return invokeRiot('account', { gameName, tagLine });
}

/**
 * 소환사명#태그로 프로필(레벨/티어)과 최근 매치를 조회한다.
 * 우리 앱 유저의 Riot ID이고 그 유저가 전적을 비공개로 해두었다면 hidden이 true이고 매치는 비어 있다.
 * @returns {Promise<{ profile: object, recentMatches: Array<object>, hidden: boolean, owner: object|null }>}
 */
export function searchSummoner(gameName, tagLine) {
  return invokeRiot('search', { gameName, tagLine });
}

/**
 * 우리 앱 유저의 프로필과 최근 매치를 조회한다.
 * @param {string} userId - 조회할 유저 id [Required]
 * @returns {Promise<{ user: object, profile: object|null, recentMatches: Array<object>, hidden: boolean }>}
 */
export function getUserMatches(userId) {
  return invokeRiot('userMatches', { userId });
}

/**
 * 나와 팔로우한 친구들의 최근 전적 카드 목록.
 * @returns {Promise<{ cards: Array<object>, followingCount: number, hiddenCount: number }>}
 */
export function getFriendsFeed() {
  return invokeRiot('friendsFeed');
}

/**
 * 경기 상세(참가자 지표, 팀 합계)와 댓글/리액션 가능 여부.
 * @param {string} matchId - 예: KR_8386059145 [Required]
 * @returns {Promise<{ match: object, appUsers: Array<object>, viewerIsPlayer: boolean, canInteract: boolean }>}
 */
export function getMatchDetail(matchId) {
  return invokeRiot('matchDetail', { matchId });
}

/** 나와 팔로우한 친구들의 주간 KDA/딜량 랭킹과 최근 24시간 하이라이트. */
export function getLeaderboard() {
  return invokeRiot('leaderboard');
}
