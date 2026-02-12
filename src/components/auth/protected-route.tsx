import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth-store";

interface ProtectedRouteProps {
  children: ReactNode;
}

// Обёртка для защищённых роутов
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === "idle" || status === "loading") {
    // Показываем простой лоадер, пока не знаем, авторизован ли пользователь
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">
          Проверяем авторизацию...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
