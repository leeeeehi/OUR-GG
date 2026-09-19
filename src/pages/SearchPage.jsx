import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { searchSummoner, getRiotErrorMessage } from '../lib/riotApi';
import { getChampionIconUrl, getProfileIconUrl } from '../lib/ddragon';
import { parseRiotId } from '../utils/validators';
import { formatRelativeTime } from '../utils/format-date';
import { formatDuration } from '../utils/format-duration';
import useDdragonVersion from '../hooks/useDdragonVersion';
import useChampions from '../hooks/useChampions';
import EmptyState from '../components/ui/EmptyState';
import RiotDisclaimer from '../components/common/RiotDisclaimer';

/** 티어 칩에 표시할 문구. 마스터 이상은 rank가 비어 있고, 배치 전이면 티어 자체가 없다. */
function formatTierLabel(result) {
  if (!result.tier) return '언랭크';
  return [result.tier, result.rank, `${result.leaguePoints ?? 0}LP`].filter(Boolean).join(' ');
}

export default function SearchPage() {
  const version = useDdragonVersion();
  const { getChampionById } = useChampions();
  const [riotId, setRiotId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSearched(true);
    setResult(null);
    const parsed = parseRiotId(riotId);
    if (!parsed) {
      setError('소환사명#태그 형식으로 입력해주세요 (예: Hide on bush#KR1)');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const { profile, recentMatches } = await searchSummoner(parsed.gameName, parsed.tagLine);
      setResult({ ...profile, recentMatches });
    } catch (err) {
      // 존재하지 않는 Riot ID는 오류가 아니라 "검색 결과 없음"으로 보여준다
      if (err?.code !== 'RIOT_NOT_FOUND') setError(getRiotErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 2 }}>
          전적 검색
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Hide on bush#KR1"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
          />
          <Button type="submit" variant="contained" disabled={isLoading}>
            검색
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {error ? <Alert severity="warning">{error}</Alert> : null}

        {!error && !isLoading && searched && !result ? (
          <EmptyState title="검색 결과가 없습니다" description="소환사명을 다시 확인해주세요" />
        ) : null}

        {result ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar src={getProfileIconUrl(result.profileIconId, version)} sx={{ width: 56, height: 56 }}>
                {result.gameName[0]}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                  {result.gameName}#{result.tagLine}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                  레벨 {result.summonerLevel}
                </Typography>
                <Chip size="small" sx={{ mt: 0.5 }} label={formatTierLabel(result)} />
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography sx={{ fontWeight: 700, mb: 1 }}>최근 매치</Typography>
            {result.recentMatches.length === 0 ? (
              <EmptyState title="최근 매치가 없습니다" description="최근에 플레이한 경기가 없거나 비공개 상태예요" />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {result.recentMatches.map((match) => {
                  const champion = getChampionById(match.championId);
                  return (
                    <Box
                      key={match.matchId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderLeft: '4px solid',
                        borderLeftColor: match.isWin ? 'win.main' : 'error.main',
                      }}
                    >
                      <Box
                        component="img"
                        src={getChampionIconUrl(champion.key, version)}
                        alt={champion.name}
                        sx={{ width: 36, height: 36, borderRadius: '50%' }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {match.isWin ? '승리' : '패배'} · {champion.name} {match.kills}/{match.deaths}/{match.assists}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {match.gameMode} · {formatDuration(match.gameDuration)} ·{' '}
                          {formatRelativeTime(match.gameCreation)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        ) : null}

        <RiotDisclaimer />
      </Container>
    </Box>
  );
}
