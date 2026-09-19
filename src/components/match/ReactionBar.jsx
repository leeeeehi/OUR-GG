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
 * 경기에 대한 감정표현(리액션) 바. 경기당 1인 1개이며 같은 걸 다시 누르면 취소된다.
 * 열람 권한이 있는 경기의 리액션만 조회되고, 팔로우한 친구의 경기(또는 내 경기)에서만 남길 수 있다.
 *
 * Props:
 * @param {string} matchId - 대상 경기 id [Required]
 * @param {boolean} isInteractive - 리액션을 남길 수 있는지 여부 [Optional, 기본값: false]
 *
 * Example usage:
 * <ReactionBar matchId={match.matchId} isInteractive={canInteract} />
 */
export default function ReactionBar({ matchId, isInteractive = false }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [counts, setCounts] = useState({});
  const [myReaction, setMyReaction] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const reactions = await fetchReactions(matchId);
      const counted = {};
      reactions.forEach((r) => {
        counted[r.reaction_type] = (counted[r.reaction_type] ?? 0) + 1;
      });
      setCounts(counted);
      setMyReaction(reactions.find((r) => r.user_id === userId)?.reaction_type ?? null);
    } catch {
      // 리액션을 불러오지 못해도 경기 상세 화면은 계속 보여준다
    }
  }, [matchId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClick(type) {
    if (!isInteractive || !userId || isBusy) return;
    setIsBusy(true);
    try {
      if (myReaction === type) {
        await removeReaction(matchId, userId);
      } else {
        await setReaction(matchId, userId, type);
      }
      await load();
    } finally {
      setIsBusy(false);
    }
  }

  // 남길 수 없는 경기에서는 이미 달린 반응만 보여준다
  const visibleTypes = isInteractive ? REACTION_TYPES : REACTION_TYPES.filter((type) => (counts[type] ?? 0) > 0);
  if (visibleTypes.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
      {visibleTypes.map((type) => {
        const count = counts[type] ?? 0;
        const selected = myReaction === type;
        return (
          <Chip
            key={type}
            size="small"
            label={`${REACTION_LABELS[type]}${count > 0 ? ` ${count}` : ''}`}
            variant={selected ? 'filled' : 'outlined'}
            color={selected ? 'primary' : 'default'}
            clickable={isInteractive}
            onClick={isInteractive ? () => handleClick(type) : undefined}
          />
        );
      })}
    </Box>
  );
}
