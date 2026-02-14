import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  HeartPulse,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LogoutButton } from "@/components/auth/logout-button";
import { FadeIn } from "@/components/motion";
import { motion, AnimatePresence } from "framer-motion";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function NavItem({
  to,
  icon: Icon,
  label,
  isCollapsed,
  onNavigate,
}: NavItemProps) {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    (to !== "/dashboard" && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onNavigate}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Обзор" },
    { to: "/dashboard/finance", icon: Wallet, label: "Финансы" },
    { to: "/dashboard/health", icon: HeartPulse, label: "Здоровье" },
    { to: "/dashboard/tasks", icon: CheckSquare, label: "Задачи" },
    { to: "/dashboard/settings", icon: Settings, label: "Настройки" },
  ];

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex relative flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl transition-all duration-300 ease-in-out z-30",
          isCollapsed ? "w-20" : "w-65"
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed left-0 top-0 z-40 h-screen w-65 flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl md:hidden"
            >
              {/* Mobile Sidebar Header */}
              <div className="flex h-20 items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <span className="font-bold text-lg">A</span>
                  </div>
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    Assistant
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 space-y-2 px-4 py-4">
                {navItems.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    isCollapsed={false}
                    onNavigate={handleNavClick}
                  />
                ))}
              </nav>

              {/* Mobile Footer */}
              <div className="border-t border-border/50 p-4 space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-accent/40 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {user?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Premium
                    </span>
                  </div>
                </div>
                <LogoutButton showLabel={true} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-card/30 backdrop-blur-xl p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg">Assistant</span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="h-full px-4 py-6 pb-12 sm:px-6 md:pt-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
