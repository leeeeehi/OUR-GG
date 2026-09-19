const POSITION_LABELS = {
  TOP: '탑',
  JUNGLE: '정글',
  MIDDLE: '미드',
  BOTTOM: '원딜',
  UTILITY: '서폿',
};

/** @param {string} position - Riot teamPosition 값 (TOP, JUNGLE 등) [Required] */
export function formatPosition(position) {
  return POSITION_LABELS[position] ?? '';
}

/** @param {{ kills: number, deaths: number, assists: number }} record - KDA 계산 대상 [Required] */
export function calcKda(record) {
  return (record.kills + record.assists) / Math.max(1, record.deaths);
}

/** 1000 이상은 12.3k 형태로 줄여 표시한다. @param {number} value - 표시할 숫자 [Required] */
export function formatCompact(value) {
  const number = Number(value ?? 0);
  return number >= 1000 ? `${(number / 1000).toFixed(1)}k` : String(number);
}

/**
 * 티어 칩에 표시할 문구. 마스터 이상은 rank가 비어 있고, 배치 전이면 티어 자체가 없다.
 * @param {{ tier: string|null, rank: string|null, leaguePoints: number|null }} profile - 소환사 프로필 [Required]
 */
export function formatTierLabel(profile) {
  if (!profile?.tier) return '언랭크';
  return [profile.tier, profile.rank, `${profile.leaguePoints ?? 0}LP`].filter(Boolean).join(' ');
}

/** @param {{ isWin: boolean, isRemake?: boolean }} match - 경기 요약 [Required] */
export function getResultInfo(match) {
  if (match.isRemake) return { label: '다시하기', color: 'text.disabled' };
  return match.isWin ? { label: '승리', color: 'win.main' } : { label: '패배', color: 'error.main' };
}
