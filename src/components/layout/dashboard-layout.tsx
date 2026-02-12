import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LogoutButton } from "@/components/auth/logout-button";
import { FadeIn } from "@/components/motion";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}

function NavItem({ to, icon: Icon, label, isCollapsed }: NavItemProps) {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    (to !== "/dashboard" && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-transform duration-200",
          !isActive && "group-hover:scale-110"
        )}
      />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Обзор" },
    { to: "/dashboard/finance", icon: Wallet, label: "Финансы" },
    { to: "/dashboard/tasks", icon: CheckSquare, label: "Задачи" },
    { to: "/dashboard/settings", icon: Settings, label: "Настройки" },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl transition-all duration-300 ease-in-out z-30",
          isCollapsed ? "w-[80px]" : "w-[260px]"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-20 items-center px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <span className="font-bold text-lg">A</span>
            </div>
            {!isCollapsed && (
              <FadeIn direction="right" distance={10}>
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Assistant
                </span>
              </FadeIn>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-4 py-4">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Footer / User Profile */}
        <div className="border-t border-border/50 p-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl bg-accent/40 p-3 transition-all",
              isCollapsed && "justify-center p-2"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-foreground">
                  {user?.email?.split("@")[0] || "User"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Premium
                </span>
              </div>
            )}
          </div>

          <div
            className={cn(
              "mt-4 flex gap-2",
              isCollapsed && "flex-col items-center"
            )}
          >
            <LogoutButton showLabel={!isCollapsed} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-auto"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden pt-6">
        <div className="h-full px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
