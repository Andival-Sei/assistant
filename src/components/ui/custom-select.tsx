import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  label,
  disabled,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-xs text-muted-foreground ml-1">{label}</label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "relative w-full h-10 px-3 text-left rounded-xl border bg-background text-sm transition-all flex items-center justify-between outline-none focus:ring-0",
              isOpen
                ? "ring-2 ring-primary/20 border-primary"
                : "border-input hover:bg-accent/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "flex items-center gap-2 truncate",
                !selectedOption && "text-muted-foreground"
              )}
            >
              {selectedOption?.icon}
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-1" align="start" matchTriggerWidth>
          <div className="max-h-60 overflow-y-auto">
            {options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "relative flex w-full select-none items-center rounded-lg py-2 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    option.value === value && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {option.icon}
                    {option.label}
                  </span>
                  {option.value === value && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Нет данных
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
