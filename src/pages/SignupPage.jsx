import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { signUp } from '../lib/auth';
import { isAtLeast14YearsOld, isValidEmail, isValidPassword } from '../utils/validators';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    nickname: '',
    birthDate: '',
    riotGameName: '',
    riotTagLine: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!isValidEmail(form.email)) return setError('올바른 이메일 형식을 입력해주세요.');
    if (!isValidPassword(form.password)) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (!form.nickname.trim()) return setError('닉네임을 입력해주세요.');
    if (!isAtLeast14YearsOld(form.birthDate)) return setError('만 14세 미만은 가입할 수 없습니다.');
    if (!form.riotGameName.trim() || !form.riotTagLine.trim()) {
      return setError('Riot ID(소환사명, 태그)를 모두 입력해주세요.');
    }
    if (!agreed) return setError('이용약관 및 개인정보처리방침에 동의해주세요.');

    setIsSubmitting(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp({
      email: form.email,
      password: form.password,
      nickname: form.nickname.trim(),
      birthDate: form.birthDate,
      riotGameName: form.riotGameName.trim(),
      riotTagLine: form.riotTagLine.trim(),
    });
    setIsSubmitting(false);

    if (signUpError) {
      if (signUpError.message === 'DUPLICATE_RIOT_ID') {
        setError('이미 연동된 Riot ID입니다. 다른 계정과 연동되어 있는지 확인해주세요.');
      } else if (signUpError.message === 'DUPLICATE_NICKNAME') {
        setError('이미 사용 중인 닉네임입니다.');
      } else if (signUpError.message?.includes('already')) {
        setError('이미 가입된 이메일입니다.');
      } else {
        setError('회원가입에 실패했습니다.');
      }
      return;
    }

    if (needsEmailConfirmation) {
      setNotice('가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해주세요.');
      return;
    }

    navigate('/');
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 700, textAlign: 'center', mb: 3 }}>
          회원가입
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {notice ? <Alert severity="success">{notice}</Alert> : null}

          <TextField label="이메일" type="email" value={form.email} onChange={update('email')} required fullWidth />
          <TextField
            label="비밀번호"
            type="password"
            value={form.password}
            onChange={update('password')}
            helperText="8자 이상"
            required
            fullWidth
          />
          <TextField label="닉네임" value={form.nickname} onChange={update('nickname')} required fullWidth />
          <TextField
            label="생년월일"
            type="date"
            value={form.birthDate}
            onChange={update('birthDate')}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="만 14세 미만은 가입할 수 없습니다"
            required
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="소환사명"
              value={form.riotGameName}
              onChange={update('riotGameName')}
              required
              sx={{ flex: 2 }}
            />
            <TextField label="태그" value={form.riotTagLine} onChange={update('riotTagLine')} required sx={{ flex: 1 }} placeholder="KR1" />
          </Box>

          <FormControlLabel
            control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
            label={
              <Typography sx={{ fontSize: '0.85rem' }}>
                <Link component={RouterLink} to="/terms">
                  이용약관 및 개인정보처리방침
                </Link>
                에 동의합니다
              </Typography>
            }
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            가입하기
          </Button>
        </Box>

        <Typography sx={{ textAlign: 'center', mt: 3, fontSize: '0.9rem' }}>
          이미 계정이 있으신가요?{' '}
          <Link component={RouterLink} to="/login">
            로그인
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}
