import { supabase } from './supabase';

const NOTIFICATION_SELECT = '*, actor:og_users!og_notifications_actor_id_fkey(id, nickname, profile_image_url)';

/** @param {string} userId - 알림을 가져올 유저 id [Required] */
export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('og_notifications')
    .select(NOTIFICATION_SELECT)
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/** @param {string} userId - 안 읽은 알림 수를 가져올 유저 id [Required] */
export async function fetchUnreadCount(userId) {
  const { count, error } = await supabase
    .from('og_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

/** @param {string} userId - 모든 알림을 읽음 처리할 유저 id [Required] */
export async function markAllRead(userId) {
  const { error } = await supabase.from('og_notifications').update({ is_read: true }).eq('receiver_id', userId).eq('is_read', false);
  if (error) throw error;
}

/** @param {number|string} notificationId - 읽음 처리할 알림 id [Required] */
export async function markRead(notificationId) {
  const { error } = await supabase.from('og_notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw error;
}
