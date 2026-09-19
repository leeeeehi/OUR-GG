import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { getRecentMatches, createPostFromMatch, getRiotErrorMessage, isMockPuuid } from '../lib/riotApi';
import useAuth from '../hooks/useAuth';
import MatchPickerItem from '../components/post/MatchPickerItem';
import RiotLinkNotice from '../components/common/RiotLinkNotice';
import EmptyState from '../components/ui/EmptyState';

const MAX_CAPTION_LENGTH = 200;

export default function PostCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const puuid = profile?.puuid;
  const isLinked = Boolean(puuid) && !isMockPuuid(puuid);

  const [matches, setMatches] = useState([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(isLinked);
  const [matchesError, setMatchesError] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLinked) return undefined;

    let active = true;
    setIsMatchesLoading(true);
    setMatchesError('');
    getRecentMatches(puuid, 10)
      .then((list) => {
        if (active) setMatches(list);
      })
      .catch((err) => {
        if (active) setMatchesError(getRiotErrorMessage(err, '최근 매치를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (active) setIsMatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [puuid, isLinked]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!matches.some((m) => m.matchId === selectedMatchId)) {
      setError('공유할 매치를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const post = await createPostFromMatch({ matchId: selectedMatchId, caption, visibility });
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(getRiotErrorMessage(err, '게시물 등록에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 2 }}>
          전적 공유하기
        </Typography>

        <RiotLinkNotice />

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>내 최근 매치 중 선택</Typography>
          {isMatchesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : matchesError ? (
            <Alert severity="warning">{matchesError}</Alert>
          ) : isLinked && matches.length === 0 ? (
            <EmptyState title="최근 매치가 없어요" description="최근에 플레이한 경기가 있어야 공유할 수 있어요" />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {matches.map((match) => (
                <MatchPickerItem
                  key={match.matchId}
                  match={match}
                  selected={selectedMatchId === match.matchId}
                  onSelect={setSelectedMatchId}
                />
              ))}
            </Box>
          )}

          <TextField
            label="한 줄 소감 / 피드백 요청"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            slotProps={{ htmlInput: { maxLength: MAX_CAPTION_LENGTH } }}
            helperText={`${caption.length}/${MAX_CAPTION_LENGTH}`}
            multiline
            minRows={2}
            fullWidth
          />

          <Box>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 1 }}>공개범위</Typography>
            <ToggleButtonGroup
              exclusive
              value={visibility}
              onChange={(_e, value) => value && setVisibility(value)}
              size="small"
            >
              <ToggleButton value="public">전체공개</ToggleButton>
              <ToggleButton value="friends">친구공개</ToggleButton>
              <ToggleButton value="private">비공개</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting || !isLinked}>
            등록하기
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
