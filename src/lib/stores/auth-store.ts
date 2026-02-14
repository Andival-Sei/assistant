import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/db/supabase-client";

// Состояние авторизации приложения
interface AuthState {
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  user: User | null;
  session: Session | null;
}

// Экшены для управления состоянием авторизации
interface AuthActions {
  setLoading: () => void;
  setUnauthenticated: () => void;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
  logout: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// Глобальный store авторизации через Zustand
export const useAuthStore = create<AuthStore>((set) => ({
  status: "idle",
  user: null,
  session: null,

  setLoading: () =>
    set(() => ({
      status: "loading",
    })),

  setUnauthenticated: () =>
    set(() => ({
      status: "unauthenticated",
      user: null,
      session: null,
    })),

  setSession: (session) =>
    set(() => ({
      status: session ? "authenticated" : "unauthenticated",
      user: session?.user ?? null,
      session,
    })),

  clearSession: () =>
    set(() => ({
      status: "unauthenticated",
      user: null,
      session: null,
    })),

  logout: async () => {
    await supabaseClient.auth.signOut();
    set({ status: "unauthenticated", user: null, session: null });
  },
}));
