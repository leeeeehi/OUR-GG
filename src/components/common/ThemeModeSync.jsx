import { useEffect } from 'react';
import { useColorScheme } from '@mui/material/styles';
import useAuth from '../../hooks/useAuth';

/** 로그인 사용자의 og_user_settings.theme 값에 맞춰 MUI 컬러스킴을 동기화한다 (화면에는 아무것도 렌더하지 않음). */
export default function ThemeModeSync() {
  const { settings } = useAuth();
  const { setMode } = useColorScheme();

  useEffect(() => {
    if (settings?.theme) setMode(settings.theme);
  }, [settings?.theme, setMode]);

  return null;
}
