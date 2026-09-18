import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import useAuth from '../hooks/useAuth';
import {
  fetchFollowing,
  fetchFollowers,
  followUser,
  unfollowUser,
  searchUsersByNickname,
} from '../lib/follows';
import EmptyState from '../components/ui/EmptyState';

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('following');
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [followingList, followerList] = await Promise.all([fetchFollowing(user.id), fetchFollowers(user.id)]);
      setFollowing(followingList);
      setFollowers(followerList);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const followingIds = new Set(following.map((f) => f.id));

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    const results = await searchUsersByNickname(query.trim());
    setSearchResults(results.filter((u) => u.id !== user.id));
  }

  async function handleFollow(targetId) {
    await followUser(user.id, targetId);
    await load();
  }

  async function handleUnfollow(targetId) {
    await unfollowUser(user.id, targetId);
    await load();
  }

  function renderUserRow(person, isFollowingPerson, onToggle) {
    return (
      <Box key={person.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
        <Link component={RouterLink} to={`/users/${person.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0, color: 'text.primary', textDecoration: 'none' }}>
          <Avatar src={person.profile_image_url ?? undefined} sx={{ width: 36, height: 36 }}>
            {person.nickname?.[0] ?? '?'}
          </Avatar>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{person.nickname}</Typography>
        </Link>
        <Button size="small" variant={isFollowingPerson ? 'outlined' : 'contained'} onClick={onToggle}>
          {isFollowingPerson ? '언팔로우' : '팔로우'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 2 }}>
          친구 찾기 / 팔로우 관리
        </Typography>

        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="닉네임으로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="contained">
            검색
          </Button>
        </Box>

        {searchResults ? (
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>검색 결과</Typography>
            {searchResults.length === 0 ? (
              <EmptyState title="검색 결과가 없습니다" />
            ) : (
              searchResults.map((person) =>
                renderUserRow(person, followingIds.has(person.id), () =>
                  followingIds.has(person.id) ? handleUnfollow(person.id) : handleFollow(person.id),
                ),
              )
            )}
          </Box>
        ) : null}

        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="following" label={`팔로잉 (${following.length})`} />
          <Tab value="followers" label={`팔로워 (${followers.length})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : tab === 'following' ? (
          following.length === 0 ? (
            <EmptyState title="아직 팔로우한 친구가 없어요" description="위 검색으로 친구를 찾아보세요" />
          ) : (
            following.map((person) => renderUserRow(person, true, () => handleUnfollow(person.id)))
          )
        ) : followers.length === 0 ? (
          <EmptyState title="아직 팔로워가 없어요" />
        ) : (
          followers.map((person) => renderUserRow(person, followingIds.has(person.id), () =>
            followingIds.has(person.id) ? handleUnfollow(person.id) : handleFollow(person.id),
          ))
        )}
      </Container>
    </Box>
  );
}
