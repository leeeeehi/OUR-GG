import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import { getLeaderboard, getRiotErrorMessage } from '../lib/riotApi';
import useDdragonVersion from '../hooks/useDdragonVersion';
import EmptyState from '../components/ui/EmptyState';
import HighlightRow from '../components/leaderboard/HighlightRow';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const version = useDdragonVersion();

  const [tab, setTab] = useState('kda');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLeaderboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(getRiotErrorMessage(err, '랭킹을 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeRows = data ? (tab === 'kda' ? data.byKda : data.byDamage) : [];
  const { topDamage, topKda } = data?.highlights ?? {};

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 0.5 }}>친구 랭킹</Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
          나와 팔로우한 친구들의 최근 경기(최대 10판) 중 지난 7일 기록 기준이에요
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data.followingCount === 0 ? (
          <EmptyState
            title="팔로우한 친구가 없어요"
            description="친구를 팔로우하면 랭킹을 볼 수 있어요"
            actionLabel="친구 찾아보기"
            onAction={() => navigate('/friends')}
          />
        ) : (
          <>
            {data.failedCount > 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                일부 유저의 전적을 아직 불러오지 못했어요. 잠시 후 다시 확인해주세요.
              </Alert>
            ) : null}

            {topDamage || topKda ? (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '0.95rem' }}>최근 24시간 하이라이트</Typography>
                {topDamage ? <HighlightRow label="최고 딜량" entry={topDamage} version={version} /> : null}
                {topKda ? <HighlightRow label="최고 KDA" entry={topKda} version={version} /> : null}
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
                    <Link
                      component={RouterLink}
                      to={`/users/${row.userId}`}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0, color: 'text.primary', textDecoration: 'none' }}
                    >
                      <Avatar src={row.profileImageUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                        {row.nickname?.[0] ?? '?'}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{row.nickname}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{row.matchCount}판</Typography>
                      </Box>
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
