import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";

import "react-day-picker/style.css";

interface CalendarModalProps {
  isOpen: boolean;
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  onClose: () => void;
  fromYear?: number;
  toYear?: number;
}

const capitalize = (value: string) =>
  value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;

export function CalendarModal({
  isOpen,
  selected,
  onSelect,
  onClose,
  fromYear = 2020,
  toYear = 2030,
}: CalendarModalProps) {
  const [displayMonth, setDisplayMonth] = useState<Date>(
    selected ?? new Date()
  );

  useEffect(() => {
    if (isOpen) {
      setDisplayMonth(selected ?? new Date());
    }
  }, [isOpen, selected]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => ({
        value: String(index),
        label: capitalize(
          format(new Date(2020, index, 1), "LLLL", { locale: ru })
        ),
      })),
    []
  );

  const yearOptions = useMemo(
    () =>
      Array.from({ length: toYear - fromYear + 1 }).map((_, index) => {
        const year = fromYear + index;
        return { value: String(year), label: String(year) };
      }),
    [fromYear, toYear]
  );

  const currentMonthIndex = displayMonth.getMonth();
  const currentYear = displayMonth.getFullYear();

  const handlePrevMonth = () => {
    const next = new Date(displayMonth);
    next.setMonth(next.getMonth() - 1);
    setDisplayMonth(next);
  };

  const handleNextMonth = () => {
    const next = new Date(displayMonth);
    next.setMonth(next.getMonth() + 1);
    setDisplayMonth(next);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <CustomSelect
                    options={monthOptions}
                    value={String(currentMonthIndex)}
                    onChange={(value) => {
                      const next = new Date(displayMonth);
                      next.setMonth(Number(value));
                      setDisplayMonth(next);
                    }}
                    className="min-w-[140px]"
                  />
                  <CustomSelect
                    options={yearOptions}
                    value={String(currentYear)}
                    onChange={(value) => {
                      const next = new Date(displayMonth);
                      next.setFullYear(Number(value));
                      setDisplayMonth(next);
                    }}
                    className="min-w-[96px]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 calendar-modal">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  onSelect(date);
                  onClose();
                }}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                locale={ru}
                showOutsideDays
                hideNavigation
                components={{
                  MonthCaption: () => <></>,
                  Nav: () => <></>,
                }}
                className="p-0"
                classNames={{
                  months: "flex flex-col",
                  month: "space-y-3",
                  caption: "hidden",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell:
                    "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: cn(
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md transition-colors data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:hover:bg-foreground data-[selected]:hover:text-background focus:bg-foreground focus:text-background outline-none focus:outline-none focus:ring-0"
                  ),
                  day_selected:
                    "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
                  day_today: "text-foreground font-medium",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
