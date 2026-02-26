import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/db/supabase-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { queryClient } from "@/providers/query-provider";

import { LoadingScreen } from "@/components/ui/loading-screen";

interface AuthProviderProps {
  children: ReactNode;
}

// Провайдер, который синхронизирует Zustand store с Supabase Auth
export function AuthProvider({ children }: AuthProviderProps) {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);

  useEffect(() => {
    let isMounted = true;

    // При первом монтировании подтягиваем текущую сессию
    const bootstrap = async () => {
      setLoading();
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (!isMounted) return;

        if (error) {
          // В dev реж. полезно увидеть ошибку, но не ломаем UI

          console.error("[AuthProvider] getSession error", error);
          queryClient.clear();
          setUnauthenticated();
          return;
        }

        prevUserIdRef.current = data.session?.user?.id ?? null;
        if (!data.session) {
          queryClient.clear();
        }
        setSession(data.session ?? null);
      } catch (error) {
        console.error("[AuthProvider] unexpected getSession error", error);
        queryClient.clear();
        setUnauthenticated();
      } finally {
        if (isMounted) {
          setIsBootstrapped(true);
        }
      }
    };

    void bootstrap();

    // Подписка на изменения состояния авторизации
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      const prevUserId = prevUserIdRef.current;
      if (event === "SIGNED_OUT" || prevUserId !== nextUserId) {
        queryClient.clear();
      }
      prevUserIdRef.current = nextUserId;
      setSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setLoading, setSession, setUnauthenticated]);

  if (!isBootstrapped) {
    return <LoadingScreen />;
  }

  return children;
}
