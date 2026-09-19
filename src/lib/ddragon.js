/**
 * Riot Data Dragon(공개 정적 CDN, API 키 불필요) 조회 모듈.
 * 최신 게임 버전, 전체 챔피언 목록(한국어), 챔피언/프로필 아이콘 URL을 제공한다.
 */

const DDRAGON_BASE_URL = 'https://ddragon.leagueoflegends.com';
const DDRAGON_FALLBACK_VERSION = '14.24.1';
const CHAMPIONS_STORAGE_PREFIX = 'ourgg_champions_';

let cachedVersion = null;
let championsPromise = null;
// 챔피언 숫자 id -> { id, key(아이콘 파일명), name(한국어 이름) }
let championMap = new Map();

/** Data Dragon 최신 버전을 가져온다 (실패 시 고정 버전으로 폴백). */
export async function getDdragonVersion() {
  if (cachedVersion) return cachedVersion;
  try {
    const res = await fetch(`${DDRAGON_BASE_URL}/api/versions.json`);
    const versions = await res.json();
    cachedVersion = Array.isArray(versions) && versions[0] ? versions[0] : DDRAGON_FALLBACK_VERSION;
  } catch {
    cachedVersion = DDRAGON_FALLBACK_VERSION;
  }
  return cachedVersion;
}

/**
 * @param {string|null} championKey - 챔피언 아이콘 파일명 (예: 'Ahri') [Required]
 * @param {string} version - Data Dragon 버전 [Optional]
 */
export function getChampionIconUrl(championKey, version = DDRAGON_FALLBACK_VERSION) {
  if (!championKey) return undefined;
  return `${DDRAGON_BASE_URL}/cdn/${version}/img/champion/${championKey}.png`;
}

/**
 * @param {number} profileIconId - 소환사 프로필 아이콘 id [Required]
 * @param {string} version - Data Dragon 버전 [Optional]
 */
export function getProfileIconUrl(profileIconId, version = DDRAGON_FALLBACK_VERSION) {
  if (profileIconId === undefined || profileIconId === null) return undefined;
  return `${DDRAGON_BASE_URL}/cdn/${version}/img/profileicon/${profileIconId}.png`;
}

function readStoredChampions(version) {
  try {
    const raw = localStorage.getItem(`${CHAMPIONS_STORAGE_PREFIX}${version}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeChampions(version, list) {
  try {
    // 지난 버전 캐시는 정리한다
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CHAMPIONS_STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(`${CHAMPIONS_STORAGE_PREFIX}${version}`, JSON.stringify(list));
  } catch {
    // localStorage 접근 불가(프라이빗 브라우징 등) 시 메모리 캐시만 사용
  }
}

/** 전체 챔피언 목록을 한 번만 불러와 메모리에 보관한다. 실패하면 다음 호출에서 다시 시도한다. */
export function loadChampions() {
  if (!championsPromise) {
    championsPromise = (async () => {
      const version = await getDdragonVersion();
      let list = readStoredChampions(version);

      if (!list) {
        try {
          const res = await fetch(`${DDRAGON_BASE_URL}/cdn/${version}/data/ko_KR/champion.json`);
          const json = await res.json();
          list = Object.values(json.data).map((c) => ({ id: Number(c.key), key: c.id, name: c.name }));
          storeChampions(version, list);
        } catch {
          championsPromise = null;
          return;
        }
      }

      championMap = new Map(list.map((c) => [c.id, c]));
    })();
  }
  return championsPromise;
}

/**
 * 챔피언 숫자 id로 이름/아이콘 파일명을 찾는다. 아직 로딩 전이거나 모르는 id면 '알 수 없음'을 반환한다.
 * @param {number} championId - Riot 챔피언 숫자 id [Required]
 */
export function getChampionById(championId) {
  return championMap.get(Number(championId)) ?? { id: championId, key: null, name: '알 수 없음' };
}
