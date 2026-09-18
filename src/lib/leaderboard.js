import { supabase } from './supabase';

const RANK_POST_SELECT =
  'id, user_id, caption, champion_id, kills, deaths, assists, damage_dealt, created_at, author:og_users!og_posts_user_id_fkey(id, nickname, profile_image_url)';

function computeKda(post) {
  return (post.kills + post.assists) / Math.max(1, post.deaths);
}

/** @param {Array<string>} userIds - 랭킹에 포함할 유저 id 목록(나+팔로잉) [Required] */
export async function fetchWeeklyLeaderboard(userIds) {
  if (!userIds || userIds.length === 0) return { byKda: [], byDamage: [] };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('og_posts')
    .select(RANK_POST_SELECT)
    .in('user_id', userIds)
    .eq('is_hidden', false)
    .gte('created_at', weekAgo);
  if (error) throw error;

  const byUser = new Map();
  (data ?? []).forEach((post) => {
    const key = post.user_id;
    const entry = byUser.get(key) ?? {
      userId: key,
      nickname: post.author?.nickname ?? '알 수 없음',
      profileImageUrl: post.author?.profile_image_url ?? null,
      postCount: 0,
      totalKda: 0,
      totalDamage: 0,
    };
    entry.postCount += 1;
    entry.totalKda += computeKda(post);
    entry.totalDamage += post.damage_dealt ?? 0;
    byUser.set(key, entry);
  });

  const rows = Array.from(byUser.values()).map((entry) => ({
    userId: entry.userId,
    nickname: entry.nickname,
    profileImageUrl: entry.profileImageUrl,
    postCount: entry.postCount,
    avgKda: entry.totalKda / entry.postCount,
    avgDamage: entry.totalDamage / entry.postCount,
  }));

  return {
    byKda: [...rows].sort((a, b) => b.avgKda - a.avgKda),
    byDamage: [...rows].sort((a, b) => b.avgDamage - a.avgDamage),
  };
}

/** @param {Array<string>} userIds - 하이라이트를 계산할 유저 id 목록(나+팔로잉) [Required] */
export async function fetchDailyHighlights(userIds) {
  if (!userIds || userIds.length === 0) return { topDamagePost: null, topKdaPost: null };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('og_posts')
    .select(RANK_POST_SELECT)
    .in('user_id', userIds)
    .eq('is_hidden', false)
    .gte('created_at', dayAgo);
  if (error) throw error;

  const posts = data ?? [];
  if (posts.length === 0) return { topDamagePost: null, topKdaPost: null };

  const topDamagePost = posts.reduce((best, p) => ((p.damage_dealt ?? 0) > (best.damage_dealt ?? 0) ? p : best));
  const topKdaPost = posts.reduce((best, p) => (computeKda(p) > computeKda(best) ? p : best));

  return { topDamagePost, topKdaPost };
}
