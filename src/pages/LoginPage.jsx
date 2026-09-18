import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { signIn } from '../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    navigate('/');
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography sx={{ fontSize: { xs: '1.75rem', md: '2rem' }, fontWeight: 700, textAlign: 'center', mb: 1 }}>
          OUR.GG
        </Typography>
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 4 }}>
          우리들의 롤 전적을 공유하는 미니 SNS
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            로그인
          </Button>
        </Box>

        <Typography sx={{ textAlign: 'center', mt: 3, fontSize: '0.9rem' }}>
          아직 계정이 없으신가요?{' '}
          <Link component={RouterLink} to="/signup">
            회원가입
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}
