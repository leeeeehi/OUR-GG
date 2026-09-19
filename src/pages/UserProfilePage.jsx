import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import { fetchProfile } from '../lib/auth';
import { fetchFollowCounts, isFollowing as checkIsFollowing, followUser, unfollowUser } from '../lib/follows';
import { fetchMyBlockedIds, blockUser, unblockUser } from '../lib/blocks';
import { getRiotErrorMessage } from '../lib/riotApi';
import { formatTierLabel } from '../utils/match-format';
import useAuth from '../hooks/useAuth';
import useUserMatches from '../hooks/useUserMatches';
import MatchList from '../components/match/MatchList';
import EmptyState from '../components/ui/EmptyState';

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [counts, setCounts] = useState({ followerCount: 0, followingCount: 0 });
  const [following, setFollowingState] = useState(false);
  const [blocked, setBlockedState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);

  const { data: matchData, loading: matchesLoading, error: matchesError } = useUserMatches(userId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRow, countRow] = await Promise.all([fetchProfile(userId), fetchFollowCounts(userId)]);
      if (!profileRow) {
        setError('존재하지 않는 사용자입니다.');
        return;
      }
      setProfile(profileRow);
      setCounts(countRow);
      if (user && user.id !== userId) {
        const [followState, blockedIds] = await Promise.all([
          checkIsFollowing(user.id, userId),
          fetchMyBlockedIds(user.id),
        ]);
        setFollowingState(followState);
        setBlockedState(blockedIds.includes(userId));
      }
    } catch {
      setError('프로필을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFollowToggle() {
    if (following) {
      await unfollowUser(user.id, userId);
    } else {
      await followUser(user.id, userId);
    }
    await load();
  }

  async function handleBlockConfirm() {
    await blockUser(user.id, userId);
    setIsBlockConfirmOpen(false);
    await load();
  }

  async function handleUnblock() {
    await unblockUser(user.id, userId);
    await load();
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 6 }}>
        <Container maxWidth="sm">
          <Alert severity="warning">{error}</Alert>
        </Container>
      </Box>
    );
  }

  const isSelf = user && user.id === userId;

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar src={profile.profile_image_url ?? undefined} sx={{ width: 64, height: 64 }}>
            {profile.nickname?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', md: '1.3rem' } }}>
              {profile.nickname}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {profile.riot_game_name}#{profile.riot_tag_line}
            </Typography>
            {matchData?.profile ? <Chip size="small" sx={{ mt: 0.5 }} label={formatTierLabel(matchData.profile)} /> : null}
          </Box>
        </Box>

        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 2 }}>
          팔로워 {counts.followerCount} · 팔로잉 {counts.followingCount}
        </Typography>

        {!isSelf ? (
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Button variant={following ? 'outlined' : 'contained'} onClick={handleFollowToggle} disabled={blocked}>
              {following ? '언팔로우' : '팔로우'}
            </Button>
            {blocked ? (
              <Button variant="outlined" color="error" onClick={handleUnblock}>
                차단 해제
              </Button>
            ) : (
              <Button variant="outlined" color="error" onClick={() => setIsBlockConfirmOpen(true)}>
                차단하기
              </Button>
            )}
          </Box>
        ) : null}

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 2 }}>최근 전적</Typography>

        {blocked ? (
          <EmptyState title="차단한 사용자입니다" description="차단을 해제하면 전적이 다시 표시됩니다" />
        ) : matchesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : matchesError ? (
          <EmptyState
            title={matchesError.code === 'RIOT_ID_NOT_LINKED' ? 'Riot ID를 아직 연동하지 않았어요' : '전적을 불러오지 못했어요'}
            description={getRiotErrorMessage(matchesError)}
          />
        ) : matchData.hidden ? (
          <EmptyState title="전적이 비공개예요" description="이 유저가 전적을 공개하지 않도록 설정했어요" />
        ) : (
          <MatchList matches={matchData.recentMatches} focusUserId={userId} />
        )}

        <Dialog open={isBlockConfirmOpen} onClose={() => setIsBlockConfirmOpen(false)}>
          <DialogTitle>{profile.nickname}님을 차단하시겠습니까?</DialogTitle>
          <DialogActions>
            <Button onClick={() => setIsBlockConfirmOpen(false)}>취소</Button>
            <Button color="error" onClick={handleBlockConfirm}>
              차단
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
