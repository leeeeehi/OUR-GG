const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_AGE = 14;
const MIN_PASSWORD_LENGTH = 8;

/**
 * @param {string} email - 검증할 이메일 문자열 [Required]
 */
export function isValidEmail(email) {
  return EMAIL_REGEX.test(email ?? '');
}

/**
 * @param {string} password - 검증할 비밀번호 문자열 [Required]
 */
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * @param {string} birthDate - 'YYYY-MM-DD' 형식 생년월일 [Required]
 */
export function isAtLeast14YearsOld(birthDate) {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= MIN_AGE;
}

/**
 * @param {string} riotId - 'Hide on bush#KR1' 형식 Riot ID 문자열 [Required]
 */
export function parseRiotId(riotId) {
  const parts = (riotId ?? '').split('#');
  if (parts.length !== 2) return null;
  const [gameName, tagLine] = parts.map((p) => p.trim());
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}
