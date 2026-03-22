'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export function AuthSessionSync() {
  const { setUser, setSession } = useUserStore();

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to restore auth session:', error.message);
        return;
      }

      if (!isMounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
    }

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setUser]);

  return null;
}
