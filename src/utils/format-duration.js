/**
 * @param {number} seconds - 게임 진행 시간(초) [Required]
 */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}
