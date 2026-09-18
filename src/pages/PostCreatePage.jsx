import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { getRecentMatches, getMatchDetail } from '../lib/mockRiotApi';
import { createPost } from '../lib/posts';
import useAuth from '../hooks/useAuth';
import MatchPickerItem from '../components/post/MatchPickerItem';

export default function PostCreatePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const matches = useMemo(
    () => (profile ? getRecentMatches(profile.riot_game_name, profile.riot_tag_line, 10) : []),
    [profile],
  );

  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const match = matches.find((m) => m.matchId === selectedMatchId);
    if (!match) {
      setError('공유할 매치를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchDetail = getMatchDetail(match.matchId, { ...match, gameName: profile.riot_game_name });
      const post = await createPost({ userId: user.id, match, matchDetail, caption, visibility });
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(err?.code === '23505' ? '이미 등록한 매치입니다.' : '게시물 등록에 실패했습니다.');
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

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>내 최근 매치 중 선택</Typography>
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

          <TextField
            label="한 줄 소감 / 피드백 요청"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
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

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            등록하기
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
