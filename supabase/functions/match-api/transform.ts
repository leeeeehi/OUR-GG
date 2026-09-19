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
  champLevel?: number;
  teamPosition?: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  goldEarned?: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken?: number;
  visionScore?: number;
  placement?: number;
  playerSubteamId?: number;
  gameEndedInEarlySurrender?: boolean;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
}

export interface RiotTeam {
  teamId: number;
  win?: boolean;
  objectives?: Record<string, { kills?: number } | undefined>;
}

export interface RiotMatch {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameMode: string;
    gameDuration: number;
    gameCreation: number;
    participants: RiotParticipant[];
    teams?: RiotTeam[];
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
  tagLine: string;
  level: number;
  position: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damageDealt: number;
  damageTaken: number;
  visionScore: number;
  items: number[];
  placement: number | null;
}

export interface TrimmedTeam {
  /** 5:5 모드는 100/200, 아레나처럼 서브팀이 있는 모드는 서브팀 번호 */
  teamId: number;
  /** 아레나 순위 (해당 없으면 null) */
  placement: number | null;
  isWin: boolean;
  kills: number;
  gold: number;
  damageDealt: number;
  towers: number | null;
  dragons: number | null;
  barons: number | null;
}

/** 캐시에 저장하는 경기 데이터 (서버 전용, puuid 포함) */
export interface TrimmedMatch {
  matchId: string;
  queueId: number;
  gameMode: string;
  gameDuration: number;
  gameCreation: number;
  isRemake: boolean;
  participants: TrimmedParticipant[];
  teams: TrimmedTeam[];
}

export interface MatchSummary {
  matchId: string;
  gameMode: string;
  gameDuration: number;
  gameCreation: number;
  isWin: boolean;
  isRemake: boolean;
  championId: number;
  championName: string;
  position: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damageDealt: number;
}

export const MOCK_PUUID_PREFIX = 'mock-puuid-';
export const MAX_FEED_FRIENDS = 30;

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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function objectiveKills(team: RiotTeam | undefined, key: string): number | null {
  const kills = team?.objectives?.[key]?.kills;
  return typeof kills === 'number' ? kills : null;
}

/** Riot match-v5 원본을 캐시용 구조로 줄인다. 형태가 예상과 다르면 예외를 던진다. */
export function trimMatch(raw: RiotMatch): TrimmedMatch {
  const info = raw?.info;
  const matchId = raw?.metadata?.matchId;
  if (!matchId || !info || !Array.isArray(info.participants) || info.participants.length === 0) {
    throw new Error('UNEXPECTED_MATCH_SHAPE');
  }

  // 2021년 이후 경기는 초 단위, 그 이전 경기는 밀리초 단위로 내려온다
  const gameDuration = info.gameDuration > 100000 ? Math.round(info.gameDuration / 1000) : info.gameDuration;

  const participants: TrimmedParticipant[] = info.participants.map((p) => ({
    puuid: p.puuid,
    participantId: p.participantId,
    // 아레나는 teamId가 100/200뿐이고 실제 듀오 구분은 playerSubteamId에 있으므로 이를 팀으로 쓴다
    teamId: typeof p.playerSubteamId === 'number' && p.playerSubteamId > 0 ? p.playerSubteamId : p.teamId,
    isWin: Boolean(p.win),
    championId: p.championId,
    championName: p.championName ?? '',
    summonerName: p.riotIdGameName || p.summonerName || '소환사',
    tagLine: p.riotIdTagline ?? '',
    level: p.champLevel ?? 0,
    position: p.teamPosition ?? '',
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
    gold: p.goldEarned ?? 0,
    damageDealt: p.totalDamageDealtToChampions ?? 0,
    damageTaken: p.totalDamageTaken ?? 0,
    visionScore: p.visionScore ?? 0,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((id) => id ?? 0),
    placement: typeof p.placement === 'number' && p.placement > 0 ? p.placement : null,
  }));

  // 팀 단위 합계. 오브젝트 정보가 없는 모드(아레나 등)는 null로 둔다
  const teamIds = [...new Set(participants.map((p) => p.teamId))];
  const teams: TrimmedTeam[] = teamIds.map((teamId) => {
    const members = participants.filter((p) => p.teamId === teamId);
    const rawTeam = info.teams?.find((t) => t.teamId === teamId);
    const placements = members.map((p) => p.placement).filter((v): v is number => v !== null);
    return {
      teamId,
      placement: placements.length > 0 ? Math.min(...placements) : null,
      isWin: members[0]?.isWin ?? false,
      kills: members.reduce((sum, p) => sum + p.kills, 0),
      gold: members.reduce((sum, p) => sum + p.gold, 0),
      damageDealt: members.reduce((sum, p) => sum + p.damageDealt, 0),
      towers: objectiveKills(rawTeam, 'tower'),
      dragons: objectiveKills(rawTeam, 'dragon'),
      barons: objectiveKills(rawTeam, 'baron'),
    };
  });

  return {
    matchId,
    queueId: info.queueId,
    gameMode: queueLabel(info.queueId, info.gameMode),
    gameDuration,
    gameCreation: info.gameCreation,
    isRemake: info.participants.some((p) => p.gameEndedInEarlySurrender === true) && gameDuration < 300,
    participants,
    teams,
  };
}

/** 특정 소환사 시점의 경기 요약 (목록/카드용). 참가자가 아니면 null. */
export function summarizeForPuuid(match: TrimmedMatch, puuid: string): MatchSummary | null {
  const mine = match.participants.find((p) => p.puuid === puuid);
  if (!mine) return null;
  return {
    matchId: match.matchId,
    gameMode: match.gameMode,
    gameDuration: match.gameDuration,
    gameCreation: match.gameCreation,
    isWin: mine.isWin,
    isRemake: match.isRemake,
    championId: mine.championId,
    championName: mine.championName,
    position: mine.position,
    kills: mine.kills,
    deaths: mine.deaths,
    assists: mine.assists,
    cs: mine.cs,
    damageDealt: mine.damageDealt,
  };
}

/**
 * 클라이언트에 내려주는 경기 상세. puuid는 제거하고, 우리 앱 유저에 해당하는 참가자에게만 userId를 붙인다.
 * @param userIdsByPuuid - 조회자에게 보여도 되는 앱 유저의 puuid -> userId 매핑
 */
export function toClientMatch(match: TrimmedMatch, userIdsByPuuid: Record<string, string>) {
  return {
    matchId: match.matchId,
    gameMode: match.gameMode,
    gameDuration: match.gameDuration,
    gameCreation: match.gameCreation,
    isRemake: match.isRemake,
    teams: match.teams,
    participants: match.participants.map((p) => {
      const { puuid, ...rest } = p;
      return { ...rest, userId: userIdsByPuuid[puuid] ?? null };
    }),
  };
}

export function computeKda(match: { kills: number; deaths: number; assists: number }): number {
  return (match.kills + match.assists) / Math.max(1, match.deaths);
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  matches: MatchSummary[];
}

/** 최근 7일 평균 KDA/딜량 랭킹과 최근 24시간 최고 기록. 다시하기(리메이크) 경기는 제외한다. */
export function buildLeaderboard(entries: LeaderboardEntry[], nowMs: number) {
  const rows = [];
  let topDamage = null;
  let topKda = null;

  for (const entry of entries) {
    const valid = entry.matches.filter((m) => !m.isRemake);
    const weekly = valid.filter((m) => m.gameCreation >= nowMs - WEEK_MS);
    if (weekly.length > 0) {
      rows.push({
        userId: entry.userId,
        nickname: entry.nickname,
        profileImageUrl: entry.profileImageUrl,
        matchCount: weekly.length,
        avgKda: weekly.reduce((sum, m) => sum + computeKda(m), 0) / weekly.length,
        avgDamage: weekly.reduce((sum, m) => sum + m.damageDealt, 0) / weekly.length,
      });
    }

    for (const match of valid.filter((m) => m.gameCreation >= nowMs - DAY_MS)) {
      const who = { userId: entry.userId, nickname: entry.nickname, profileImageUrl: entry.profileImageUrl, match };
      if (!topDamage || match.damageDealt > topDamage.match.damageDealt) topDamage = who;
      if (!topKda || computeKda(match) > computeKda(topKda.match)) topKda = who;
    }
  }

  return {
    byKda: [...rows].sort((a, b) => b.avgKda - a.avgKda),
    byDamage: [...rows].sort((a, b) => b.avgDamage - a.avgDamage),
    highlights: { topDamage, topKda },
  };
}

export function isValidPuuid(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(value);
}

export function isValidMatchId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9]{2,6}_\d{5,15}$/.test(value);
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidRiotIdPart(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}
