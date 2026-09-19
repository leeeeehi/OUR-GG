import Box from '@mui/material/Box';
import MatchListItem from './MatchListItem';
import EmptyState from '../ui/EmptyState';

/**
 * 경기 요약 목록. 비어 있으면 안내 문구를 보여준다.
 *
 * Props:
 * @param {Array} matches - riot 경기 요약 목록 [Required]
 * @param {string} focusUserId - 상세 화면에서 강조할 유저 id [Optional]
 *
 * Example usage:
 * <MatchList matches={data.recentMatches} focusUserId={userId} />
 */
export default function MatchList({ matches, focusUserId }) {
  if (!matches || matches.length === 0) {
    return <EmptyState title="최근 전적이 없어요" description="최근에 플레이한 경기가 없거나 아직 반영되지 않았어요" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {matches.map((match) => (
        <MatchListItem key={match.matchId} match={match} focusUserId={focusUserId} />
      ))}
    </Box>
  );
}
