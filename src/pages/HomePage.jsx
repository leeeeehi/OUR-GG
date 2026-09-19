import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import useFriendsFeed from '../hooks/useFriendsFeed';
import { getRiotErrorMessage } from '../lib/riotApi';
import { formatRelativeTime } from '../utils/format-date';
import PlayerSearchBox from '../components/home/PlayerSearchBox';
import FriendMatchCard from '../components/friends/FriendMatchCard';
import RiotLinkNotice from '../components/common/RiotLinkNotice';
import EmptyState from '../components/ui/EmptyState';

export default function HomePage() {
  const navigate = useNavigate();
  const { cards, followingCount, hiddenCount, loading, error, updatedAt, isRefreshing, refresh } = useFriendsFeed();

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <PlayerSearchBox />

        <RiotLinkNotice />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>친구들의 전적</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {updatedAt ? (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatRelativeTime(updatedAt)} 갱신</Typography>
            ) : null}
            <IconButton size="small" aria-label="새로고침" onClick={refresh} disabled={isRefreshing}>
              {isRefreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error && cards.length === 0 ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refresh}>
                다시 시도
              </Button>
            }
          >
            {getRiotErrorMessage(error, '친구들의 전적을 불러오지 못했습니다.')}
          </Alert>
        ) : (
          <>
            {cards.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {cards.map((card) => (
                  <FriendMatchCard key={card.userId} card={card} />
                ))}
              </Box>
            ) : null}

            {followingCount === 0 ? (
              <EmptyState
                title="아직 팔로우한 친구가 없어요"
                description="친구를 찾아 팔로우하면 친구들의 전적이 여기에 실시간으로 보여요"
                actionLabel="친구 찾아보기"
                onAction={() => navigate('/friends')}
              />
            ) : null}

            {hiddenCount > 0 ? (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center', mt: 2 }}>
                전적을 비공개로 설정했거나 아직 Riot ID를 연동하지 않은 친구 {hiddenCount}명은 표시되지 않아요
              </Typography>
            ) : null}
          </>
        )}
      </Container>
    </Box>
  );
}
