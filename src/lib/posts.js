import { supabase } from './supabase';

const POST_SELECT = '*, author:og_users!og_posts_user_id_fkey(id, nickname, profile_image_url, tier, rank)';

/** @param {number} [limit] - 가져올 게시물 수 [Optional, 기본값: 30] */
export async function fetchPublicPosts(limit = 30) {
  const { data, error } = await supabase
    .from('og_posts')
    .select(POST_SELECT)
    .eq('visibility', 'public')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** @param {Array<string>} followingIds - 내가 팔로우한 유저 id 목록 [Required] */
export async function fetchFollowingFeed(followingIds) {
  if (!followingIds || followingIds.length === 0) return [];
  const { data, error } = await supabase
    .from('og_posts')
    .select(POST_SELECT)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

/** @param {string} userId - 게시물 작성자 id [Required] */
export async function fetchPostsByUser(userId) {
  const { data, error } = await supabase
    .from('og_posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** @param {number|string} postId - 조회할 게시물 id [Required] */
export async function fetchPostById(postId) {
  const { data, error } = await supabase
    .from('og_posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 게시물 등록은 전적 수치 위조를 막기 위해 서버(riot-proxy Edge Function)가 Riot 원본으로 저장한다.
// 클라이언트에서는 lib/riotApi.js의 createPostFromMatch를 사용한다.

/** @param {number|string} postId - 댓글을 가져올 게시물 id [Required] */
export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from('og_comments')
    .select('*, author:og_users!og_comments_user_id_fkey(id, nickname, profile_image_url)')
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * @param {object} params - 등록할 댓글 데이터 [Required]
 * params: { postId, userId, content, timelineTag }
 */
export async function createComment({ postId, userId, content, timelineTag }) {
  const { data, error } = await supabase
    .from('og_comments')
    .insert({ post_id: postId, user_id: userId, content, timeline_tag: timelineTag || null })
    .select('*, author:og_users!og_comments_user_id_fkey(id, nickname, profile_image_url)')
    .single();
  if (error) throw error;
  return data;
}
