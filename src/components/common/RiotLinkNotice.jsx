import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import useAuth from '../../hooks/useAuth';
import { isMockPuuid } from '../../lib/riotApi';

/**
 * 예전 목업 단계에서 가입해 실제 Riot 계정과 연동되지 않은 유저에게 재연동을 안내한다.
 * 이미 실제 Riot ID로 연동된 유저에게는 아무것도 그리지 않는다.
 *
 * Example usage:
 * <RiotLinkNotice />
 */
export default function RiotLinkNotice() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  if (!profile || !isMockPuuid(profile.puuid)) return null;

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" onClick={() => navigate('/settings')}>
          설정으로
        </Button>
      }
    >
      아직 실제 Riot 계정과 연동되지 않았어요. 설정에서 Riot ID를 다시 연동해주세요.
    </Alert>
  );
}
