import { createContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ensureProfile, fetchProfile } from '../lib/auth';

export const AuthContext = createContext(null);

/**
 * @param {object} props - AuthProvider props [Required]
 * @param {React.ReactNode} props.children - 하위 트리 [Required]
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setProfile(null);
      return;
    }
    await ensureProfile(authUser);
    const row = await fetchProfile(authUser.id);
    setProfile(row);
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
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = { user, profile, loading, setProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
