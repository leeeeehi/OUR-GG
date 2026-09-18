import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import useAuth from '../hooks/useAuth';
import usePosts from '../hooks/usePosts';
import { fetchPostsByUser } from '../lib/posts';
import { signOut } from '../lib/auth';
import PostCard from '../components/post/PostCard';
import EmptyState from '../components/ui/EmptyState';

export default function MyPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { posts, loading } = usePosts(() => fetchPostsByUser(user.id), [user.id]);

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar src={profile?.profile_image_url ?? undefined} sx={{ width: 64, height: 64 }}>
            {profile?.nickname?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', md: '1.3rem' } }}>
              {profile?.nickname ?? '...'}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {profile?.riot_game_name}#{profile?.riot_tag_line}
            </Typography>
            {profile?.tier ? (
              <Chip size="small" sx={{ mt: 0.5 }} label={`${profile.tier} ${profile.rank ?? ''} ${profile.league_points ?? 0}LP`} />
            ) : null}
          </Box>
        </Box>

        <Button variant="outlined" onClick={handleLogout} sx={{ mb: 3 }}>
          로그아웃
        </Button>

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 2 }}>내가 올린 게시물</Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <EmptyState
            title="아직 올린 게시물이 없어요"
            actionLabel="전적 공유하기"
            onAction={() => navigate('/posts/new')}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
