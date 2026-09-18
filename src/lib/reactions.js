import { supabase } from './supabase';

export const REACTION_TYPES = ['like', 'carry', 'bus', 'feedback_needed'];

/** @param {number|string} postId - 감정표현 목록을 가져올 게시물 id [Required] */
export async function fetchReactions(postId) {
  const { data, error } = await supabase.from('og_post_reactions').select('user_id, reaction_type').eq('post_id', postId);
  if (error) throw error;
  return data;
}

/**
 * @param {number|string} postId - 감정표현을 남길 게시물 id [Required]
 * @param {string} userId - 감정표현을 남기는 유저 id [Required]
 * @param {string} reactionType - REACTION_TYPES 중 하나 [Required]
 */
export async function setReaction(postId, userId, reactionType) {
  const { data, error } = await supabase
    .from('og_post_reactions')
    .upsert({ post_id: postId, user_id: userId, reaction_type: reactionType }, { onConflict: 'post_id,user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * @param {number|string} postId - 감정표현을 취소할 게시물 id [Required]
 * @param {string} userId - 감정표현을 취소하는 유저 id [Required]
 */
export async function removeReaction(postId, userId) {
  const { error } = await supabase.from('og_post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw error;
}
