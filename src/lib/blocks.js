import { supabase } from './supabase';

/** @param {string} userId - 내 차단 목록을 가져올 유저 id [Required] */
export async function fetchMyBlockedIds(userId) {
  const { data, error } = await supabase.from('og_blocks').select('blocked_id').eq('blocker_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.blocked_id);
}

/**
 * @param {string} blockerId - 차단을 실행하는 유저 id [Required]
 * @param {string} blockedId - 차단 대상 유저 id [Required]
 */
export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from('og_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

/**
 * @param {string} blockerId - 차단 해제를 실행하는 유저 id [Required]
 * @param {string} blockedId - 차단 해제 대상 유저 id [Required]
 */
export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from('og_blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw error;
}
