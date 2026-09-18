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
  return error;
}

/** 이미 사용 중인 닉네임 또는 Riot ID인지 확인한다 (가입 전 사전 검증용). */
async function findDuplicateProfile(nickname, riotGameName, riotTagLine) {
  const puuid = generateMockPuuid(riotGameName, riotTagLine);
  const { data } = await supabase
    .from('og_users')
    .select('nickname, puuid')
    .or(`nickname.eq.${nickname},puuid.eq.${puuid}`)
    .limit(1);
  if (!data || data.length === 0) return null;
  return data[0].puuid === puuid ? 'riotId' : 'nickname';
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

/** @param {string} userId - 조회할 유저 id [Required] */
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('og_users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
