import { supabase } from './supabase';

const COMMENT_SELECT = '*, author:og_users!og_match_comments_user_id_fkey(id, nickname, profile_image_url)';

/** @param {string} matchId - 댓글을 가져올 경기 id [Required] */
export async function fetchMatchComments(matchId) {
  const { data, error } = await supabase
    .from('og_match_comments')
    .select(COMMENT_SELECT)
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * @param {object} params - 등록할 댓글 데이터 [Required]
 * params: { matchId, userId, content, timelineTag }
 */
export async function createMatchComment({ matchId, userId, content, timelineTag }) {
  const { data, error } = await supabase
    .from('og_match_comments')
    .insert({ match_id: matchId, user_id: userId, content, timeline_tag: timelineTag || null })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}
