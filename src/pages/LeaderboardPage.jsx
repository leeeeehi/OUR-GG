import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import useAuth from '../hooks/useAuth';
import { fetchFollowing } from '../lib/follows';
import { fetchWeeklyLeaderboard, fetchDailyHighlights } from '../lib/leaderboard';
import useDdragonVersion from '../hooks/useDdragonVersion';
import EmptyState from '../components/ui/EmptyState';
import HighlightRow from '../components/leaderboard/HighlightRow';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const version = useDdragonVersion();

  const [tab, setTab] = useState('kda');
  const [rows, setRows] = useState({ byKda: [], byDamage: [] });
  const [highlights, setHighlights] = useState({ topDamagePost: null, topKdaPost: null });
  const [hasFriends, setHasFriends] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const following = await fetchFollowing(user.id);
      const userIds = [user.id, ...following.map((f) => f.id)];
      if (!active) return;
      setHasFriends(following.length > 0);

      const [leaderboard, dailyHighlights] = await Promise.all([
        fetchWeeklyLeaderboard(userIds),
        fetchDailyHighlights(userIds),
      ]);
      if (!active) return;
      setRows(leaderboard);
      setHighlights(dailyHighlights);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user.id]);

  const activeRows = tab === 'kda' ? rows.byKda : rows.byDamage;

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 2 }}>
          친구 랭킹
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !hasFriends ? (
          <EmptyState
            title="팔로우한 친구가 없어요"
            description="친구를 팔로우하면 랭킹을 볼 수 있어요"
            actionLabel="친구 찾아보기"
            onAction={() => navigate('/friends')}
          />
        ) : (
          <>
            {(highlights.topDamagePost || highlights.topKdaPost) ? (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '0.95rem' }}>
                  최근 24시간 하이라이트
                </Typography>
                {highlights.topDamagePost ? (
                  <HighlightRow label="최고 딜량" post={highlights.topDamagePost} version={version} />
                ) : null}
                {highlights.topKdaPost ? (
                  <HighlightRow label="최고 KDA" post={highlights.topKdaPost} version={version} />
                ) : null}
              </Paper>
            ) : null}

            <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab value="kda" label="주간 KDA" />
              <Tab value="damage" label="주간 딜량" />
            </Tabs>

            {activeRows.length === 0 ? (
              <EmptyState title="최근 1주일간 전적이 없어요" />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activeRows.map((row, index) => (
                  <Box key={row.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Typography sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>{index + 1}</Typography>
                    <Link component={RouterLink} to={`/users/${row.userId}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0, color: 'text.primary', textDecoration: 'none' }}>
                      <Avatar src={row.profileImageUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                        {row.nickname?.[0] ?? '?'}
                      </Avatar>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{row.nickname}</Typography>
                    </Link>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      {tab === 'kda' ? row.avgKda.toFixed(2) : Math.round(row.avgDamage).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
