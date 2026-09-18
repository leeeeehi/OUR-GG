/**
 * Riot API를 대체하는 목업 데이터 레이어.
 * 실제 Riot Development API Key가 없어 이번 1차 MVP는 이 모듈로 소환사/매치 데이터를 흉내낸다.
 * 추후 실제 API Key가 발급되면 searchSummoner / getRecentMatches / getMatchDetail
 * 세 함수의 구현부만 실제 Riot API 호출로 교체하면 나머지 코드는 그대로 재사용 가능하다.
 *
 * 챔피언 아이콘만은 실제 Riot Data Dragon 공개 정적 CDN(API 키 불필요)을 사용한다.
 */

const DDRAGON_FALLBACK_VERSION = '14.24.1';
const TIERS = ['아이언', '브론즈', '실버', '골드', '플래티넘', '에메랄드', '다이아몬드'];
const RANKS = ['IV', 'III', 'II', 'I'];
const GAME_MODES = ['솔로랭크', '자유랭크', '칼바람나락'];

const CHAMPIONS = [
  { id: 103, key: 'Ahri', name: '아리' },
  { id: 157, key: 'Yasuo', name: '야스오' },
  { id: 222, key: 'Jinx', name: '징크스' },
  { id: 64, key: 'LeeSin', name: '리 신' },
  { id: 99, key: 'Lux', name: '럭스' },
  { id: 81, key: 'Ezreal', name: '이즈리얼' },
  { id: 86, key: 'Garen', name: '가렌' },
  { id: 122, key: 'Darius', name: '다리우스' },
  { id: 22, key: 'Ashe', name: '애쉬' },
  { id: 412, key: 'Thresh', name: '쓰레쉬' },
  { id: 67, key: 'Vayne', name: '베인' },
  { id: 238, key: 'Zed', name: '제드' },
  { id: 55, key: 'Katarina', name: '카타리나' },
  { id: 21, key: 'MissFortune', name: '미스 포츈' },
  { id: 89, key: 'Leona', name: '레오나' },
  { id: 84, key: 'Akali', name: '아칼리' },
  { id: 777, key: 'Yone', name: '요네' },
  { id: 234, key: 'Viego', name: '비에고' },
  { id: 202, key: 'Jhin', name: '진' },
  { id: 145, key: 'Kaisa', name: '카이사' },
];

let cachedVersion = null;

/** Data Dragon 최신 버전을 가져온다 (실패 시 고정 버전으로 폴백, API 키 불필요한 공개 CDN 호출). */
export async function getDdragonVersion() {
  if (cachedVersion) return cachedVersion;
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await res.json();
    cachedVersion = Array.isArray(versions) && versions[0] ? versions[0] : DDRAGON_FALLBACK_VERSION;
  } catch {
    cachedVersion = DDRAGON_FALLBACK_VERSION;
  }
  return cachedVersion;
}

export function getChampionIconUrl(championKey, version = DDRAGON_FALLBACK_VERSION) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championKey}.png`;
}

export function getChampionById(championId) {
  return CHAMPIONS.find((c) => c.id === championId) ?? CHAMPIONS[0];
}

// 문자열을 32bit 정수 해시로 변환 (같은 입력 -> 같은 결과, 목업 데이터 재현용)
function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// mulberry32 시드 기반 PRNG - 같은 시드면 항상 같은 난수열
function createRng(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function riotIdKey(gameName, tagLine) {
  return `${gameName}#${tagLine}`.toLowerCase().trim();
}

/** 실제 puuid 대신 사용할 결정적 목업 식별자 */
export function generateMockPuuid(gameName, tagLine) {
  const hash = hashString(riotIdKey(gameName, tagLine)).toString(36);
  return `mock-puuid-${hash}`;
}

function generateMockProfile(gameName, tagLine) {
  const rng = createRng(hashString(riotIdKey(gameName, tagLine)));
  return {
    puuid: generateMockPuuid(gameName, tagLine),
    gameName,
    tagLine,
    summonerLevel: 30 + Math.floor(rng() * 250),
    tier: pick(rng, TIERS),
    rank: pick(rng, RANKS),
    leaguePoints: Math.floor(rng() * 100),
  };
}

function generateMockMatch(gameName, tagLine, index) {
  const seedKey = `${riotIdKey(gameName, tagLine)}-match-${index}`;
  const rng = createRng(hashString(seedKey));
  const champion = pick(rng, CHAMPIONS);
  const isWin = rng() > 0.45;
  const kills = Math.floor(rng() * 12);
  const deaths = Math.floor(rng() * 9);
  const assists = Math.floor(rng() * 15);
  const damageDealt = 8000 + Math.floor(rng() * 22000);
  const gameDuration = 900 + Math.floor(rng() * 1500); // 15~40분
  const gameCreation = Date.now() - index * (3600 * 1000 * (2 + Math.floor(rng() * 20)));

  return {
    matchId: `KR_MOCK_${hashString(seedKey)}`,
    gameMode: pick(rng, GAME_MODES),
    gameDuration,
    gameCreation,
    isWin,
    championId: champion.id,
    championKey: champion.key,
    championName: champion.name,
    kills,
    deaths,
    assists,
    damageDealt,
  };
}

/** 특정 소환사의 최근 매치 요약 목록을 생성한다. */
export function getRecentMatches(gameName, tagLine, count = 10) {
  return Array.from({ length: count }, (_, i) => generateMockMatch(gameName, tagLine, i));
}

/** 매치 1개의 10인 상세 데이터를 생성한다 (matchId + 시드로 재현 가능). */
export function getMatchDetail(matchId, ownerSummary) {
  const rng = createRng(hashString(`${matchId}-detail`));
  const myTeam = ownerSummary.isWin ? 100 : 200;

  const participants = Array.from({ length: 10 }, (_, i) => {
    const isOwner = i === 0;
    const champion = isOwner ? getChampionById(ownerSummary.championId) : pick(rng, CHAMPIONS);
    const teamId = i < 5 ? 100 : 200;
    const isWin = teamId === myTeam;
    return {
      participantId: i + 1,
      teamId,
      isOwner,
      summonerName: isOwner ? `${ownerSummary.gameName ?? '나'}` : `소환사${i + 1}`,
      championId: champion.id,
      championKey: champion.key,
      championName: champion.name,
      isWin,
      kills: isOwner ? ownerSummary.kills : Math.floor(rng() * 12),
      deaths: isOwner ? ownerSummary.deaths : Math.floor(rng() * 9),
      assists: isOwner ? ownerSummary.assists : Math.floor(rng() * 15),
      damageDealt: isOwner ? ownerSummary.damageDealt : 6000 + Math.floor(rng() * 22000),
      items: Array.from({ length: 6 }, () => Math.floor(rng() * 4)), // 목업 아이템 슬롯 (표시는 챔피언 아이콘으로 대체)
    };
  });

  return {
    matchId,
    gameMode: ownerSummary.gameMode,
    gameDuration: ownerSummary.gameDuration,
    gameCreation: ownerSummary.gameCreation,
    participants,
  };
}

/** 소환사명#태그로 검색해 종합 전적 + 최근 매치 목록을 반환한다. */
export function searchSummoner(gameName, tagLine) {
  if (!gameName || !tagLine) return null;
  const profile = generateMockProfile(gameName, tagLine);
  const recentMatches = getRecentMatches(gameName, tagLine, 10);
  return { ...profile, recentMatches };
}
