import React from "react";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

import "react-day-picker/style.css";

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
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-start text-left font-normal pl-3 h-10 rounded-xl border-input bg-background hover:bg-accent/50",
          !selected && "text-muted-foreground",
          isOpen && "border-primary ring-1 ring-primary"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
        {selected ? (
          format(selected, "PPP", { locale: ru })
        ) : (
          <span>Выберите дату</span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-card border border-border rounded-xl shadow-inner flex justify-center">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  onSelect(date);
                  setIsOpen(false);
                }}
                locale={ru}
                showOutsideDays={true}
                captionLayout="dropdown-buttons"
                fromYear={2020}
                toYear={2030}
                components={{
                  Chevron: ({ orientation }) => {
                    switch (orientation) {
                      case "left":
                        return <ChevronLeft className="h-4 w-4" />;
                      case "right":
                        return <ChevronRight className="h-4 w-4" />;
                      case "up":
                        return <ChevronUp className="h-4 w-4" />;
                      case "down":
                        return <ChevronDown className="h-4 w-4" />;
                      default:
                        return <></>;
                    }
                  },
                }}
                className="p-3"
                classNames={{
                  months:
                    "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption:
                    "flex justify-center pt-1 relative items-center gap-1",
                  caption_label: "hidden",
                  caption_dropdowns: "flex justify-center gap-1",
                  dropdown:
                    "bg-background border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer",
                  nav: "space-x-1 flex items-center absolute right-0 top-0 h-full",
                  nav_button: cn(
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity border border-border rounded-md flex items-center justify-center focus:outline-none focus:ring-0",
                    "type-button"
                  ),
                  nav_button_previous:
                    "!absolute left-1 top-1/2 -translate-y-1/2",
                  nav_button_next: "!absolute right-1 top-1/2 -translate-y-1/2",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell:
                    "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: cn(
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md transition-colors data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground outline-none focus:outline-none focus:ring-0"
                  ),
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-bold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
