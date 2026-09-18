const UNITS = [
  { limit: 60 * 1000, divisor: 1000, label: '초 전' },
  { limit: 60 * 60 * 1000, divisor: 60 * 1000, label: '분 전' },
  { limit: 24 * 60 * 60 * 1000, divisor: 60 * 60 * 1000, label: '시간 전' },
  { limit: 7 * 24 * 60 * 60 * 1000, divisor: 24 * 60 * 60 * 1000, label: '일 전' },
];

/**
 * @param {number|string|Date} value - 상대 시간으로 표시할 시각 [Required]
 */
export function formatRelativeTime(value) {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return '';
  const diff = Date.now() - target;
  if (diff < 0) return '방금 전';

  for (const unit of UNITS) {
    if (diff < unit.limit) {
      return `${Math.max(1, Math.floor(diff / unit.divisor))}${unit.label}`;
    }
  }
  return new Date(target).toLocaleDateString('ko-KR');
}
