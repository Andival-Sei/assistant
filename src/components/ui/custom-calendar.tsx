import { format } from "date-fns";
import { ru } from "date-fns/locale";
import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarModal } from "@/components/ui/calendar-modal";

interface CustomCalendarProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  className?: string;
}

export function CustomCalendar({
  selected,
  onSelect,
  className,
}: CustomCalendarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal pl-3 h-10 rounded-xl border-input bg-background hover:bg-accent/50",
          !selected && "text-muted-foreground",
          isOpen && "border-primary ring-1 ring-primary"
        )}
        onClick={() => setIsOpen(true)}
      >
        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
        {selected ? (
          format(selected, "PPP", { locale: ru })
        ) : (
          <span>Выберите дату</span>
        )}
      </Button>
      <CalendarModal
        isOpen={isOpen}
        selected={selected}
        onSelect={onSelect}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
