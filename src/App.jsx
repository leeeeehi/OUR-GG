import { Routes, Route, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TermsPage from './pages/TermsPage';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import PostCreatePage from './pages/PostCreatePage';
import MyPage from './pages/MyPage';
import SearchPage from './pages/SearchPage';

const NO_NAVBAR_PATHS = ['/login', '/signup'];

export default function App() {
  const location = useLocation();
  const showNavbar = !NO_NAVBAR_PATHS.includes(location.pathname);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showNavbar ? <Navbar /> : null}
      <Box sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/posts/:postId" element={<PostDetailPage />} />
          <Route
            path="/posts/new"
            element={
              <ProtectedRoute>
                <PostCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Box>
    </Box>
  );
}
