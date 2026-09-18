import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import ButtonBase from '@mui/material/ButtonBase';
import useAuth from '../hooks/useAuth';
import usePosts from '../hooks/usePosts';
import { fetchNotifications, markAllRead } from '../lib/notifications';
import { formatRelativeTime } from '../utils/format-date';
import EmptyState from '../components/ui/EmptyState';

const TYPE_TEXT = {
  follow: '님이 나를 팔로우했습니다',
  comment: '님이 내 게시물에 댓글을 남겼습니다',
  reaction: '님이 내 게시물에 반응을 남겼습니다',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { posts: notifications, loading } = usePosts(() => fetchNotifications(user.id), [user.id]);

  useEffect(() => {
    markAllRead(user.id);
  }, [user.id]);

  function handleClick(notification) {
    if (notification.target_post_id) {
      navigate(`/posts/${notification.target_post_id}`);
    } else {
      navigate(`/users/${notification.actor_id}`);
    }
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 2 }}>
          알림
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <EmptyState title="아직 알림이 없어요" />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {notifications.map((notification) => (
              <ButtonBase
                key={notification.id}
                onClick={() => handleClick(notification)}
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: notification.is_read ? 'transparent' : 'action.selected',
                }}
              >
                <Avatar src={notification.actor?.profile_image_url ?? undefined} sx={{ width: 36, height: 36 }}>
                  {notification.actor?.nickname?.[0] ?? '?'}
                </Avatar>
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.9rem' }}>
                    <strong>{notification.actor?.nickname ?? '알 수 없음'}</strong>
                    {TYPE_TEXT[notification.type] ?? ''}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {formatRelativeTime(notification.created_at)}
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
