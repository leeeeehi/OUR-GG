import { supabase } from './supabase';

const USER_BRIEF_SELECT = 'id, nickname, profile_image_url, tier, rank';

/** @param {string} userId - 팔로잉 목록을 가져올 유저 id [Required] */
export async function fetchFollowing(userId) {
  const { data, error } = await supabase
    .from('og_follows')
    .select(`following:og_users!og_follows_following_id_fkey(${USER_BRIEF_SELECT})`)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.following);
}

/** @param {string} userId - 팔로워 목록을 가져올 유저 id [Required] */
export async function fetchFollowers(userId) {
  const { data, error } = await supabase
    .from('og_follows')
    .select(`follower:og_users!og_follows_follower_id_fkey(${USER_BRIEF_SELECT})`)
    .eq('following_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.follower);
}

/** @param {string} userId - 팔로워/팔로잉 수를 가져올 유저 id [Required] */
export async function fetchFollowCounts(userId) {
  const [{ count: followerCount, error: followerError }, { count: followingCount, error: followingError }] =
    await Promise.all([
      supabase.from('og_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('og_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
  if (followerError) throw followerError;
  if (followingError) throw followingError;
  return { followerCount: followerCount ?? 0, followingCount: followingCount ?? 0 };
}

/**
 * @param {string} followerId - 조회 주체 id [Required]
 * @param {string} followingId - 팔로우 대상 id [Required]
 */
export async function isFollowing(followerId, followingId) {
  const { data, error } = await supabase
    .from('og_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/**
 * @param {string} followerId - 팔로우를 누른 유저 id [Required]
 * @param {string} followingId - 팔로우 대상 유저 id [Required]
 */
export async function followUser(followerId, followingId) {
  const { error } = await supabase.from('og_follows').insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

/**
 * @param {string} followerId - 언팔로우를 누른 유저 id [Required]
 * @param {string} followingId - 언팔로우 대상 유저 id [Required]
 */
export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from('og_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

/** @param {string} query - 검색할 닉네임 문자열 [Required] */
export async function searchUsersByNickname(query) {
  const { data, error } = await supabase
    .from('og_users')
    .select(USER_BRIEF_SELECT)
    .ilike('nickname', `%${query}%`)
    .limit(20);
  if (error) throw error;
  return data;
}
