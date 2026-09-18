import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { REACTION_TYPES, fetchReactions, setReaction, removeReaction } from '../../lib/reactions';
import useAuth from '../../hooks/useAuth';

const REACTION_LABELS = {
  like: '👍 좋아요',
  carry: '🔥 캐리',
  bus: '🚌 버스',
  feedback_needed: '🤔 훈수필요',
};

/**
 * Props:
 * @param {number|string} postId - 대상 게시물 id [Required]
 * @param {object} counts - 반응 종류별 개수 (post.reaction_counts) [Required]
 * @param {string} mode - 'readonly'(피드 카드, 개수만 표시) 또는 'interactive'(상세 페이지, 클릭 가능) [Optional, 기본값: 'readonly']
 *
 * Example usage:
 * <ReactionBar postId={post.id} counts={post.reaction_counts} mode="interactive" />
 */
export default function ReactionBar({ postId, counts, mode = 'readonly' }) {
  const { user } = useAuth();
  const [liveCounts, setLiveCounts] = useState(counts ?? {});
  const [myReaction, setMyReaction] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadMyReaction = useCallback(async () => {
    if (mode !== 'interactive' || !user) return;
    const reactions = await fetchReactions(postId);
    const counted = {};
    reactions.forEach((r) => {
      counted[r.reaction_type] = (counted[r.reaction_type] ?? 0) + 1;
    });
    setLiveCounts(counted);
    setMyReaction(reactions.find((r) => r.user_id === user.id)?.reaction_type ?? null);
  }, [mode, postId, user]);

  useEffect(() => {
    loadMyReaction();
  }, [loadMyReaction]);

  async function handleClick(type) {
    if (mode !== 'interactive' || !user || isBusy) return;
    setIsBusy(true);
    try {
      if (myReaction === type) {
        await removeReaction(postId, user.id);
      } else {
        await setReaction(postId, user.id, type);
      }
      await loadMyReaction();
    } finally {
      setIsBusy(false);
    }
  }

  const displayCounts = mode === 'interactive' ? liveCounts : counts ?? {};
  const visibleTypes =
    mode === 'interactive' ? REACTION_TYPES : REACTION_TYPES.filter((type) => (displayCounts[type] ?? 0) > 0);

  if (visibleTypes.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
      {visibleTypes.map((type) => {
        const count = displayCounts[type] ?? 0;
        const selected = mode === 'interactive' && myReaction === type;
        return (
          <Chip
            key={type}
            size="small"
            label={`${REACTION_LABELS[type]}${count > 0 ? ` ${count}` : ''}`}
            variant={selected ? 'filled' : 'outlined'}
            color={selected ? 'primary' : 'default'}
            clickable={mode === 'interactive'}
            onClick={mode === 'interactive' ? (e) => { e.stopPropagation(); handleClick(type); } : undefined}
          />
        );
      })}
    </Box>
  );
}
