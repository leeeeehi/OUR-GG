import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import useAuth from '../../hooks/useAuth';
import { fetchUnreadCount } from '../../lib/notifications';

const TABS = [
  { value: '/', label: '홈', icon: <HomeIcon /> },
  { value: '/search', label: '검색', icon: <SearchIcon /> },
  { value: '/posts/new', label: '전적공유', icon: <AddCircleIcon /> },
  { value: '/me', label: '마이페이지', icon: <PersonIcon /> },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const current = TABS.find((t) => t.value === location.pathname)?.value ?? false;

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    fetchUnreadCount(user.id).then(setUnreadCount);
  }, [user, location.pathname]);

  return (
    <>
      <AppBar position="sticky" elevation={0} color="primary">
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 700, cursor: 'pointer', flexGrow: 1 }}
            onClick={() => navigate('/')}
          >
            OUR.GG
          </Typography>
          {user ? (
            <Box>
              <IconButton color="inherit" aria-label="알림" onClick={() => navigate('/notifications')}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Box>
          ) : null}
        </Toolbar>
      </AppBar>

      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          showLabels
          value={current}
          onChange={(_e, value) => navigate(value)}
        >
          {TABS.map((tab) => (
            <BottomNavigationAction key={tab.value} label={tab.label} value={tab.value} icon={tab.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </>
  );
}
