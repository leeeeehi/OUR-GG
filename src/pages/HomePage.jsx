import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import usePosts from '../hooks/usePosts';
import { fetchPublicPosts, fetchFollowingFeed } from '../lib/posts';
import { fetchFollowing } from '../lib/follows';
import PostCard from '../components/post/PostCard';
import EmptyState from '../components/ui/EmptyState';
import useAuth from '../hooks/useAuth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading: isAuthLoading } = useAuth();
  // 유저가 직접 고르기 전에는 로그인 여부에 따라 기본 탭을 정한다
  // (새로고침 직후에는 user가 잠시 null이므로 초기값으로 고정하지 않는다)
  const [selectedTab, setSelectedTab] = useState(null);
  const tab = selectedTab ?? (user ? 'following' : 'explore');

  const followingFetch = async () => {
    if (!user) return [];
    const following = await fetchFollowing(user.id);
    return fetchFollowingFeed(following.map((f) => f.id));
  };

  const { posts, loading: isPostsLoading, error } = usePosts(
    isAuthLoading ? async () => [] : tab === 'following' ? followingFetch : () => fetchPublicPosts(30),
    [tab, user?.id, isAuthLoading],
  );
  const loading = isAuthLoading || isPostsLoading;

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Tabs value={tab} onChange={(_e, v) => setSelectedTab(v)} sx={{ mb: 2 }}>
          <Tab value="following" label="팔로잉" disabled={!user} />
          <Tab value="explore" label="탐색" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">피드를 불러오지 못했습니다.</Alert>
        ) : posts.length === 0 ? (
          tab === 'following' ? (
            <EmptyState
              title="팔로우한 친구가 없어요"
              description="친구를 찾아 팔로우하면 이곳에 전적 피드가 모여요"
              actionLabel="친구 찾아보기"
              onAction={() => navigate('/friends')}
            />
          ) : (
            <EmptyState
              title="아직 공개된 전적이 없어요"
              description="첫 번째 전적을 공유해보세요"
              actionLabel="전적 공유하기"
              onAction={() => navigate('/posts/new')}
            />
          )
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
