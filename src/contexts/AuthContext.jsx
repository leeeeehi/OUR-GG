import { createContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ensureProfile, fetchProfile } from '../lib/auth';
import { fetchUserSettings } from '../lib/settings';

export const AuthContext = createContext(null);

/**
 * 값이 같으면 이전 참조를 유지한다.
 * supabase-js는 탭에 다시 돌아올 때마다 SIGNED_IN 이벤트를 보내므로,
 * 내용이 같은데도 새 객체로 교체하면 이를 의존성으로 쓰는 화면들이 불필요하게 다시 로드된다.
 */
function keepIfSame(prev, next) {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
}

/**
 * @param {object} props - AuthProvider props [Required]
 * @param {React.ReactNode} props.children - 하위 트리 [Required]
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setProfile(null);
      setSettings(null);
      return;
    }
    await ensureProfile(authUser);
    const row = await fetchProfile(authUser.id);

    if (row?.deleted_at) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSettings(null);
      return;
    }

    const settingsRow = row ? await fetchUserSettings(authUser.id) : null;
    setProfile((prev) => keepIfSame(prev, row));
    setSettings((prev) => keepIfSame(prev, settingsRow));
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      if (mounted) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser));
      await loadProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = { user, profile, settings, loading, setProfile, setSettings };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
