import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import useAuth from '../../hooks/useAuth';

/**
 * Props:
 * @param {React.ReactNode} children - 로그인 시에만 보여줄 화면 [Required]
 *
 * Example usage:
 * <ProtectedRoute><HomePage /></ProtectedRoute>
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
