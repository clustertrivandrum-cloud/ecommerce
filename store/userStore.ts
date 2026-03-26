import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

interface UserState {
  user: User | null;
  session: Session | null;
  authModalOpen: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAuthModalOpen: (open: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  session: null,
  authModalOpen: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
}));
