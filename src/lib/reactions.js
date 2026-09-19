import { supabase } from './supabase';

export const REACTION_TYPES = ['like', 'carry', 'bus', 'feedback_needed'];

/** @param {string} matchId - 감정표현 목록을 가져올 경기 id [Required] */
export async function fetchReactions(matchId) {
  const { data, error } = await supabase.from('og_match_reactions').select('user_id, reaction_type').eq('match_id', matchId);
  if (error) throw error;
  return data;
}

/**
 * 경기당 1인 1개의 감정표현을 남기거나 바꾼다.
 * @param {string} matchId - 감정표현을 남길 경기 id [Required]
 * @param {string} userId - 감정표현을 남기는 유저 id [Required]
 * @param {string} reactionType - REACTION_TYPES 중 하나 [Required]
 */
export async function setReaction(matchId, userId, reactionType) {
  const { error } = await supabase
    .from('og_match_reactions')
    .upsert({ match_id: matchId, user_id: userId, reaction_type: reactionType }, { onConflict: 'match_id,user_id' });
  if (error) throw error;
}

/**
 * @param {string} matchId - 감정표현을 취소할 경기 id [Required]
 * @param {string} userId - 감정표현을 취소하는 유저 id [Required]
 */
export async function removeReaction(matchId, userId) {
  const { error } = await supabase.from('og_match_reactions').delete().eq('match_id', matchId).eq('user_id', userId);
  if (error) throw error;
}
