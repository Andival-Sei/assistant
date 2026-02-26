import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  showLabel?: boolean;
}

export function LogoutButton({ showLabel = true }: LogoutButtonProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await logout("local");
      navigate("/login", { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={handleLogout}
      disabled={isSubmitting}
      className={cn(
        "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
        !showLabel && "h-10 w-10 shrink-0"
      )}
    >
      <LogOut className="h-4 w-4" />
      {showLabel && <span className="ml-2">Выйти</span>}
    </Button>
  );
}
