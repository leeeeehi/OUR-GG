import { supabase } from './supabase';
import { generateMockPuuid } from './mockRiotApi';

const PENDING_SIGNUP_KEY = 'ourgg_pending_signup';

function savePendingProfile(email, profile) {
  try {
    localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({ email, profile }));
  } catch {
    // localStorage 접근 불가 시(프라이빗 브라우징 등) 무시 - 로그인 시 재시도 가능
  }
}

function readPendingProfile(email) {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.email === email ? parsed.profile : null;
  } catch {
    return null;
  }
}

function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // 무시
  }
}

/**
 * @param {string} userId - Supabase auth 유저 id [Required]
 * @param {object} profile - og_users insert에 사용할 프로필 필드 [Required]
 */
async function insertProfile(userId, profile) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('og_users').insert({
    id: userId,
    nickname: profile.nickname,
    birth_date: profile.birthDate,
    riot_game_name: profile.riotGameName,
    riot_tag_line: profile.riotTagLine,
    puuid: generateMockPuuid(profile.riotGameName, profile.riotTagLine),
    riot_verified: false,
    terms_agreed_at: now,
    privacy_agreed_at: now,
  });
  if (error) return error;

  const { error: settingsError } = await supabase.from('og_user_settings').insert({ user_id: userId });
  return settingsError;
}

/**
 * 이미 사용 중인 닉네임 또는 Riot ID인지 확인한다 (가입 전 사전 검증용).
 * 닉네임에 쉼표 등이 들어가도 필터 파싱이 깨지지 않도록 .or() 문자열 조합 대신 조건별로 조회한다.
 */
async function findDuplicateProfile(nickname, riotGameName, riotTagLine) {
  const puuid = generateMockPuuid(riotGameName, riotTagLine);
  const [puuidResult, nicknameResult] = await Promise.all([
    supabase.from('og_users').select('id').eq('puuid', puuid).limit(1),
    supabase.from('og_users').select('id').eq('nickname', nickname).limit(1),
  ]);
  if (puuidResult.data?.length) return 'riotId';
  if (nicknameResult.data?.length) return 'nickname';
  return null;
}

/**
 * 회원가입: 닉네임/Riot ID 중복을 먼저 확인한 뒤 Supabase Auth 계정을 생성한다.
 * 세션이 즉시 발급되면 프로필까지 함께 생성한다.
 * (이메일 인증이 켜진 프로젝트라면 세션이 없어 프로필 생성은 최초 로그인 시점으로 미뤄진다)
 * @param {object} params - { email, password, nickname, birthDate, riotGameName, riotTagLine } [Required]
 */
export async function signUp({ email, password, nickname, birthDate, riotGameName, riotTagLine }) {
  const duplicate = await findDuplicateProfile(nickname, riotGameName, riotTagLine);
  if (duplicate === 'riotId') return { error: { message: 'DUPLICATE_RIOT_ID' } };
  if (duplicate === 'nickname') return { error: { message: 'DUPLICATE_NICKNAME' } };

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error };

  const profile = { nickname, birthDate, riotGameName, riotTagLine };

  if (data.session) {
    const insertError = await insertProfile(data.user.id, profile);
    if (insertError) return { error: insertError };
    return { data, needsEmailConfirmation: false };
  }

  savePendingProfile(email, profile);
  return { data, needsEmailConfirmation: true };
}

/**
 * @param {string} email - 로그인 이메일 [Required]
 * @param {string} password - 로그인 비밀번호 [Required]
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };

  await ensureProfile(data.user);
  return { data };
}

export async function signOut() {
  return supabase.auth.signOut();
}

/** 로그인은 됐지만 og_users 프로필 행이 없는 경우(이메일 인증 지연 등) 보류 데이터로 생성을 보완한다. */
export async function ensureProfile(user) {
  if (!user) return null;

  const { data: existing } = await supabase.from('og_users').select('id').eq('id', user.id).maybeSingle();
  if (existing) return existing;

  const pending = readPendingProfile(user.email);
  if (!pending) return null;

  const insertError = await insertProfile(user.id, pending);
  if (!insertError) clearPendingProfile();
  return insertError ? null : { id: user.id };
}

/** 화면에서 사용하는 프로필 컬럼. 생년월일·약관 동의 시각 같은 민감 정보는 조회하지 않는다. */
const PROFILE_COLUMNS =
  'id, nickname, profile_image_url, bio, riot_game_name, riot_tag_line, puuid, riot_region, riot_verified, summoner_level, tier, rank, league_points, deleted_at, created_at, updated_at';

/** @param {string} userId - 조회할 유저 id [Required] */
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('og_users').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** @param {string} newPassword - 변경할 새 비밀번호 [Required] */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * 이미 다른 계정이 쓰고 있는 Riot ID인지 확인한다 (본인 계정은 제외).
 * @param {string} userId - 검사에서 제외할 본인 유저 id [Required]
 * @param {string} riotGameName - 확인할 소환사명 [Required]
 * @param {string} riotTagLine - 확인할 태그 [Required]
 */
async function findDuplicateRiotId(userId, riotGameName, riotTagLine) {
  const puuid = generateMockPuuid(riotGameName, riotTagLine);
  const { data } = await supabase.from('og_users').select('id').eq('puuid', puuid).neq('id', userId).maybeSingle();
  return Boolean(data);
}

/**
 * @param {object} params - 재연동할 Riot ID 데이터 [Required]
 * params: { userId, riotGameName, riotTagLine }
 */
export async function relinkRiotId({ userId, riotGameName, riotTagLine }) {
  const isDuplicate = await findDuplicateRiotId(userId, riotGameName, riotTagLine);
  if (isDuplicate) return { error: { message: 'DUPLICATE_RIOT_ID' } };

  const { data, error } = await supabase
    .from('og_users')
    .update({
      riot_game_name: riotGameName,
      riot_tag_line: riotTagLine,
      puuid: generateMockPuuid(riotGameName, riotTagLine),
      riot_verified: false,
    })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) return { error };
  return { data };
}

/** @param {string} userId - 탈퇴 처리할 유저 id [Required] */
export async function withdrawAccount(userId) {
  const { error } = await supabase
    .from('og_users')
    .update({
      deleted_at: new Date().toISOString(),
      nickname: `탈퇴 사용자-${userId.slice(0, 8)}`,
      bio: null,
      profile_image_url: null,
    })
    .eq('id', userId);
  if (error) throw error;
}
