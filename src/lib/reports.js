import { supabase } from './supabase';

/**
 * @param {object} params - 신고 데이터 [Required]
 * params: { reporterId, targetType('match_comment'), targetId, reason }
 */
export async function reportContent({ reporterId, targetType, targetId, reason }) {
  const { error } = await supabase.from('og_reports').insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  if (error) throw error;
}
