import { Loader2 } from "lucide-react";

interface MobileLoadingFallbackProps {
  message?: string;
}

export function MobileLoadingFallback({
  message = "Загрузка...",
}: MobileLoadingFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  );
}

interface MobileErrorFallbackProps {
  onRetry?: () => void;
  message?: string;
}

export function MobileErrorFallback({
  onRetry,
  message = "Произошла ошибка. Попробуйте еще раз.",
}: MobileErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Ошибка загрузки</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Попробовать снова
        </button>
      )}
    </div>
  );
}
