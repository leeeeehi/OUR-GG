import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useAuth from '../hooks/useAuth';
import { upsertUserSettings } from '../lib/settings';
import { updatePassword, relinkRiotId, withdrawAccount, signOut } from '../lib/auth';
import { getRiotErrorMessage } from '../lib/riotApi';
import { isValidPassword } from '../utils/validators';

const NOTIFY_FIELDS = [
  { key: 'notify_follow', label: '팔로우 알림' },
  { key: 'notify_comment', label: '댓글/피드백 알림' },
  { key: 'notify_reaction', label: '감정표현 알림' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, settings, setProfile, setSettings } = useAuth();

  const [riotGameName, setRiotGameName] = useState(profile?.riot_game_name ?? '');
  const [riotTagLine, setRiotTagLine] = useState(profile?.riot_tag_line ?? '');
  const [riotError, setRiotError] = useState('');
  const [riotNotice, setRiotNotice] = useState('');
  const [isRelinking, setIsRelinking] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  async function handleNotifyToggle(key, checked) {
    const updated = await upsertUserSettings(user.id, { [key]: checked });
    setSettings(updated);
  }

  async function handleThemeToggle(checked) {
    const updated = await upsertUserSettings(user.id, { theme: checked ? 'dark' : 'light' });
    setSettings(updated);
  }

  async function handleRiotSubmit(e) {
    e.preventDefault();
    setRiotError('');
    setRiotNotice('');
    if (!riotGameName.trim() || !riotTagLine.trim()) {
      setRiotError('소환사명과 태그를 모두 입력해주세요.');
      return;
    }
    setIsRelinking(true);
    const { data, error } = await relinkRiotId({ userId: user.id, riotGameName: riotGameName.trim(), riotTagLine: riotTagLine.trim() });
    setIsRelinking(false);
    if (error) {
      setRiotError(
        error.message === 'DUPLICATE_RIOT_ID'
          ? '이미 다른 계정과 연동된 Riot ID입니다.'
          : getRiotErrorMessage({ code: error.message }, '재연동에 실패했습니다.'),
      );
      return;
    }
    // 마이페이지/전적 공유 화면이 새 Riot ID를 바로 쓰도록 전역 프로필도 갱신한다
    setProfile(data);
    // Riot이 알려준 정식 표기(대소문자)로 입력칸도 맞춘다
    setRiotGameName(data.riot_game_name);
    setRiotTagLine(data.riot_tag_line);
    setRiotNotice('Riot ID가 재연동되었습니다.');
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (!isValidPassword(newPassword)) {
      setPasswordError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    try {
      await updatePassword(newPassword);
      setPasswordNotice('비밀번호가 변경되었습니다.');
      setNewPassword('');
    } catch {
      setPasswordError('비밀번호 변경에 실패했습니다.');
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  async function handleWithdraw() {
    await withdrawAccount(user.id);
    await signOut();
    navigate('/login');
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' }, fontWeight: 700, mb: 3 }}>
          설정
        </Typography>

        <Typography sx={{ fontWeight: 700, mb: 1 }}>알림</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
          {NOTIFY_FIELDS.map((field) => (
            <FormControlLabel
              key={field.key}
              control={
                <Switch
                  checked={settings ? settings[field.key] !== false : true}
                  onChange={(e) => handleNotifyToggle(field.key, e.target.checked)}
                />
              }
              label={field.label}
            />
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>화면</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={settings ? settings.theme !== 'light' : true}
              onChange={(e) => handleThemeToggle(e.target.checked)}
            />
          }
          label="다크모드"
          sx={{ mb: 2 }}
        />

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>Riot ID 재연동</Typography>
        <Box component="form" onSubmit={handleRiotSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {riotError ? <Alert severity="error">{riotError}</Alert> : null}
          {riotNotice ? <Alert severity="success">{riotNotice}</Alert> : null}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="소환사명" value={riotGameName} onChange={(e) => setRiotGameName(e.target.value)} sx={{ flex: 2 }} />
            <TextField label="태그" value={riotTagLine} onChange={(e) => setRiotTagLine(e.target.value)} sx={{ flex: 1 }} />
          </Box>
          <Button type="submit" variant="outlined" disabled={isRelinking} sx={{ alignSelf: 'flex-start' }}>
            재연동
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>비밀번호 변경</Typography>
        <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {passwordError ? <Alert severity="error">{passwordError}</Alert> : null}
          {passwordNotice ? <Alert severity="success">{passwordNotice}</Alert> : null}
          <TextField
            type="password"
            label="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="8자 이상"
          />
          <Button type="submit" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
            변경
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontSize: '0.9rem', mb: 3 }}>
          <Link component={RouterLink} to="/terms">
            이용약관 · 개인정보처리방침
          </Link>
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleLogout}>
            로그아웃
          </Button>
          <Button variant="outlined" color="error" onClick={() => setIsWithdrawOpen(true)}>
            회원 탈퇴
          </Button>
        </Box>

        <Dialog open={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)}>
          <DialogTitle>정말 탈퇴하시겠습니까?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
              탈퇴 시 프로필 정보는 익명화되고 다시 로그인할 수 없습니다. 작성한 게시물/댓글은 유지됩니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsWithdrawOpen(false)}>취소</Button>
            <Button color="error" onClick={handleWithdraw}>
              탈퇴
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
