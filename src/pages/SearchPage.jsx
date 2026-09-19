import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import { searchSummoner, getRiotErrorMessage } from '../lib/riotApi';
import { getProfileIconUrl } from '../lib/ddragon';
import { parseRiotId } from '../utils/validators';
import { formatTierLabel } from '../utils/match-format';
import useDdragonVersion from '../hooks/useDdragonVersion';
import PlayerSearchBox from '../components/home/PlayerSearchBox';
import MatchList from '../components/match/MatchList';
import EmptyState from '../components/ui/EmptyState';
import RiotDisclaimer from '../components/common/RiotDisclaimer';

export default function SearchPage() {
  const version = useDdragonVersion();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const parsed = parseRiotId(query);
    if (!parsed) {
      setResult(null);
      setError(query ? '소환사명#태그 형식으로 입력해주세요 (예: Hide on bush#KR1)' : '');
      return undefined;
    }

    let active = true;
    setResult(null);
    setError('');
    setIsLoading(true);
    searchSummoner(parsed.gameName, parsed.tagLine)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err) => {
        // 존재하지 않는 Riot ID는 오류가 아니라 "검색 결과 없음"으로 보여준다
        if (active && err?.code !== 'RIOT_NOT_FOUND') setError(getRiotErrorMessage(err));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  const profile = result?.profile;
  const owner = result?.owner;

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 2 }}>전적 검색</Typography>

        {/* query가 바뀌면 입력칸도 새 검색어로 채워지도록 key를 준다 */}
        <PlayerSearchBox key={query} initialValue={query} />

        <Box sx={{ mt: 3 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : null}

          {error ? <Alert severity="warning">{error}</Alert> : null}

          {!error && !isLoading && query && !result ? (
            <EmptyState title="검색 결과가 없습니다" description="소환사명을 다시 확인해주세요" />
          ) : null}

          {profile ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar src={getProfileIconUrl(profile.profileIconId, version)} sx={{ width: 56, height: 56 }}>
                  {profile.gameName[0]}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                    {profile.gameName}#{profile.tagLine}
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>레벨 {profile.summonerLevel}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                    <Chip size="small" label={formatTierLabel(profile)} />
                    {owner ? (
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={`OUR.GG · ${owner.nickname}`}
                        component={RouterLink}
                        to={`/users/${owner.userId}`}
                        clickable
                      />
                    ) : null}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Typography sx={{ fontWeight: 700, mb: 1 }}>최근 매치</Typography>
              {result.hidden ? (
                <EmptyState title="전적이 비공개예요" description="이 유저가 전적을 공개하지 않도록 설정했어요" />
              ) : (
                <MatchList matches={result.recentMatches} focusUserId={owner?.userId} />
              )}

              {owner ? (
                <Typography sx={{ fontSize: '0.8rem', mt: 2 }}>
                  <Link component={RouterLink} to={`/users/${owner.userId}`}>
                    {owner.nickname}님의 프로필 보기 · 팔로우하고 댓글 남기기
                  </Link>
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Box>

        <RiotDisclaimer />
      </Container>
    </Box>
  );
}
