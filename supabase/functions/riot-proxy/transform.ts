/**
 * Riot API 응답을 앱에서 쓰는 형태로 바꾸는 순수 함수 모음.
 * 네트워크/DB에 의존하지 않아 Node(node --test)와 Deno(Edge Function) 양쪽에서 실행·테스트할 수 있다.
 * (enum/namespace 등 타입 제거만으로 실행 가능한 문법만 사용한다)
 */

export interface RiotParticipant {
  puuid: string;
  participantId: number;
  teamId: number;
  win: boolean;
  championId: number;
  championName?: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
}

export interface RiotMatch {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameMode: string;
    gameDuration: number;
    gameCreation: number;
    participants: RiotParticipant[];
  };
}

export interface TrimmedParticipant {
  puuid: string;
  participantId: number;
  teamId: number;
  isWin: boolean;
  championId: number;
  championName: string;
  summonerName: string;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
}

/** 캐시에 저장하는 경기 데이터 (서버 전용, puuid 포함) */
export interface TrimmedMatch {
  matchId: string;
  queueId: number;
  gameMode: string;
  gameDuration: number;
  gameCreation: number;
  participants: TrimmedParticipant[];
}

export const VISIBILITIES = ['public', 'friends', 'private'];
export const MAX_CAPTION_LENGTH = 200;
export const MOCK_PUUID_PREFIX = 'mock-puuid-';

const QUEUE_LABELS: Record<number, string> = {
  400: '일반(드래프트)',
  420: '솔로랭크',
  430: '일반(블라인드)',
  440: '자유랭크',
  450: '칼바람나락',
  480: '빠른 대전',
  490: '빠른 대전',
  700: '격전',
  900: 'URF',
  1300: '돌격! 넥서스',
  1400: '궁극기 주문서',
  1700: '아레나',
};

// queueId를 모를 때 gameMode 문자열로 대체 라벨을 정한다
const MODE_LABELS: Record<string, string> = {
  ARAM: '칼바람나락',
  CHERRY: '아레나',
  URF: 'URF',
  ARURF: 'URF',
  CLASSIC: '일반',
};

const TIER_LABELS: Record<string, string> = {
  IRON: '아이언',
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  EMERALD: '에메랄드',
  DIAMOND: '다이아몬드',
  MASTER: '마스터',
  GRANDMASTER: '그랜드마스터',
  CHALLENGER: '챌린저',
};

// 마스터 이상은 세부 디비전(I~IV)이 의미 없으므로 표시하지 않는다
const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

export function queueLabel(queueId: number, gameMode: string): string {
  return QUEUE_LABELS[queueId] ?? MODE_LABELS[gameMode] ?? '기타';
}

/** 솔로랭크 기록만 골라 한국어 티어로 변환한다. 기록이 없으면 모두 null. */
export function formatTier(entries: unknown) {
  const list = Array.isArray(entries) ? entries : [];
  const solo = list.find((e) => e && e.queueType === 'RANKED_SOLO_5x5');
  if (!solo || !TIER_LABELS[solo.tier]) {
    return { tier: null, rank: null, leaguePoints: null };
  }
  return {
    tier: TIER_LABELS[solo.tier],
    rank: APEX_TIERS.includes(solo.tier) ? '' : String(solo.rank ?? ''),
    leaguePoints: Number(solo.leaguePoints ?? 0),
  };
}

/** Riot match-v5 원본을 캐시용 최소 구조로 줄인다. 형태가 예상과 다르면 예외를 던진다. */
export function trimMatch(raw: RiotMatch): TrimmedMatch {
  const info = raw?.info;
  const matchId = raw?.metadata?.matchId;
  if (!matchId || !info || !Array.isArray(info.participants) || info.participants.length === 0) {
    throw new Error('UNEXPECTED_MATCH_SHAPE');
  }

  // 2021년 이후 경기는 초 단위, 그 이전 경기는 밀리초 단위로 내려온다
  const gameDuration = info.gameDuration > 100000 ? Math.round(info.gameDuration / 1000) : info.gameDuration;

  return {
    matchId,
    queueId: info.queueId,
    gameMode: queueLabel(info.queueId, info.gameMode),
    gameDuration,
    gameCreation: info.gameCreation,
    participants: info.participants.map((p) => ({
      puuid: p.puuid,
      participantId: p.participantId,
      teamId: p.teamId,
      isWin: Boolean(p.win),
      championId: p.championId,
      championName: p.championName ?? '',
      summonerName: p.riotIdGameName || p.summonerName || '소환사',
      kills: p.kills ?? 0,
      deaths: p.deaths ?? 0,
      assists: p.assists ?? 0,
      damageDealt: p.totalDamageDealtToChampions ?? 0,
    })),
  };
}

/** 특정 소환사 시점의 경기 요약 (검색 결과/매치 선택 목록용). 참가자가 아니면 null. */
export function summarizeForPuuid(match: TrimmedMatch, puuid: string) {
  const mine = match.participants.find((p) => p.puuid === puuid);
  if (!mine) return null;
  return {
    matchId: match.matchId,
    gameMode: match.gameMode,
    gameDuration: match.gameDuration,
    gameCreation: match.gameCreation,
    isWin: mine.isWin,
    championId: mine.championId,
    championName: mine.championName,
    kills: mine.kills,
    deaths: mine.deaths,
    assists: mine.assists,
    damageDealt: mine.damageDealt,
  };
}

/** 게시물에 저장하는 10인 상세. 공개 조회되는 데이터이므로 puuid는 제거하고 isOwner만 남긴다. */
export function toStoredDetail(match: TrimmedMatch, ownerPuuid: string) {
  return {
    matchId: match.matchId,
    gameMode: match.gameMode,
    gameDuration: match.gameDuration,
    gameCreation: match.gameCreation,
    participants: match.participants.map((p) => ({
      participantId: p.participantId,
      teamId: p.teamId,
      isOwner: p.puuid === ownerPuuid,
      summonerName: p.summonerName,
      championId: p.championId,
      championName: p.championName,
      isWin: p.isWin,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      damageDealt: p.damageDealt,
    })),
  };
}

/** og_posts에 INSERT할 행. 전적 수치는 전부 Riot 원본에서 온 값만 사용한다. */
export function buildPostRow(
  userId: string,
  match: TrimmedMatch,
  ownerPuuid: string,
  caption: string,
  visibility: string,
) {
  const mine = match.participants.find((p) => p.puuid === ownerPuuid);
  if (!mine) throw new Error('NOT_PARTICIPANT');
  return {
    user_id: userId,
    match_id: match.matchId,
    caption: caption || null,
    visibility,
    game_mode: match.gameMode,
    game_duration: match.gameDuration,
    game_creation: new Date(match.gameCreation).toISOString(),
    is_win: mine.isWin,
    champion_id: mine.championId,
    kills: mine.kills,
    deaths: mine.deaths,
    assists: mine.assists,
    damage_dealt: mine.damageDealt,
    match_detail_json: toStoredDetail(match, ownerPuuid),
  };
}

export function sanitizeCaption(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_CAPTION_LENGTH) : '';
}

export function isValidPuuid(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(value);
}

export function isValidMatchId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9]{2,6}_\d{5,15}$/.test(value);
}

export function isValidRiotIdPart(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}
