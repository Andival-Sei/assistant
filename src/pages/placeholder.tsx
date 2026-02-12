import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  message?: string;
}

export function PlaceholderPage({
  title,
  message = "Скоро",
}: PlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Link to="/">
        <Button variant="outline">На главную</Button>
      </Link>
    </main>
  );
}
