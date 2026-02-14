import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PopoverContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setIsOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <PopoverContext.Provider
      value={{ isOpen, setIsOpen, triggerRef, contentRef }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  className,
  asChild = false,
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("PopoverTrigger must be used within Popover");

  const { setIsOpen, isOpen, triggerRef } = context;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: handleClick,
    });
  }

  return (
    <div
      ref={triggerRef}
      onClick={handleClick}
      className={cn("cursor-pointer inline-block", className)}
    >
      {children}
    </div>
  );
}

export function PopoverContent({
  children,
  className,
  align = "start",
  sideOffset = 4,
  matchTriggerWidth = false,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  matchTriggerWidth?: boolean;
}) {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("PopoverContent must be used within Popover");

  const { isOpen, contentRef, triggerRef } = context;
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const PAD = 8;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = rect.bottom + sideOffset;
    let left = rect.left;

    if (align === "center") {
      left = rect.left + rect.width / 2;
    } else if (align === "end") {
      left = rect.right;
    }

    setPosition({ top, left, width: rect.width });
  }, [align, sideOffset, triggerRef]);

  // Подгоняем left/top так, чтобы попап не выходил за viewport
  const applyViewportClamp = useCallback(
    (pos: { top: number; left: number; width: number }, contentW: number, contentH: number) => {
      let { top, left } = pos;
      const w = contentW;
      const h = contentH;
      if (w <= 0 || h <= 0) return pos;

      if (align === "center") {
        if (left - w / 2 < PAD) left = PAD + w / 2;
        if (left + w / 2 > window.innerWidth - PAD)
          left = window.innerWidth - PAD - w / 2;
      } else if (align === "end") {
        if (left - w < PAD) left = PAD + w;
        if (left > window.innerWidth - PAD) left = window.innerWidth - PAD;
      } else {
        if (left + w > window.innerWidth - PAD)
          left = window.innerWidth - PAD - w;
        if (left < PAD) left = PAD;
      }
      if (top + h > window.innerHeight - PAD) top = window.innerHeight - PAD - h;
      if (top < PAD) top = PAD;
      return { ...pos, left, top };
    },
    [align]
  );

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  // После появления контента замеряем размеры и ограничиваем позицию по экрану
  useEffect(() => {
    if (!isOpen || !position) return;

    const runClamp = () => {
      const el = contentRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (w <= 0 || h <= 0) return;
      const clamped = applyViewportClamp(position, w, h);
      if (
        clamped.left !== position.left ||
        clamped.top !== position.top
      ) {
        setPosition(clamped);
      }
    };

    // Даём порталу и ref отрендериться, затем замеряем и ограничиваем
    const t0 = requestAnimationFrame(runClamp);
    const t1 = window.setTimeout(runClamp, 80);

    const el = contentRef.current;
    if (el) {
      const ro = new ResizeObserver(runClamp);
      ro.observe(el);
      return () => {
        cancelAnimationFrame(t0);
        window.clearTimeout(t1);
        ro.disconnect();
      };
    }
    return () => {
      cancelAnimationFrame(t0);
      window.clearTimeout(t1);
    };
  }, [isOpen, position, applyViewportClamp]);

  if (!isOpen || !position) return null;

  const transform =
    align === "end"
      ? "translateX(-100%)"
      : align === "center"
        ? "translateX(-50%)"
        : "none";

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={contentRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: 0.15 }}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          zIndex: 9999,
          width: matchTriggerWidth ? position.width : undefined,
          transform,
        }}
        className={cn(
          "bg-popover text-popover-foreground border border-border rounded-xl shadow-lg outline-none overflow-hidden max-h-[min(80vh,400px)] overflow-y-auto",
          className
        )}
      >
        {children}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
