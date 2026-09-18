import { supabase } from './supabase';

/** @param {string} userId - 설정을 가져올 유저 id [Required] */
export async function fetchUserSettings(userId) {
  const { data, error } = await supabase.from('og_user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * @param {string} userId - 설정을 변경할 유저 id [Required]
 * @param {object} partial - 변경할 필드만 담은 객체 [Required]
 */
export async function upsertUserSettings(userId, partial) {
  const { data, error } = await supabase
    .from('og_user_settings')
    .upsert({ user_id: userId, ...partial, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
