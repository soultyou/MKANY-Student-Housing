import React, { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";

export interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
  className?: string;
  closeButtonAriaLabel?: string;
  hideHeader?: boolean;
  showCloseButton?: boolean;
  preventBackdropClick?: boolean;
  testId?: string;
}

export function StandardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClassName = "max-w-2xl",
  className = "",
  closeButtonAriaLabel = "إغلاق النافذة",
  hideHeader = false,
  showCloseButton = true,
  preventBackdropClick = false,
  testId,
}: StandardModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto animate-[fade-in_.15s_ease_both]"
      role="dialog"
      aria-modal="true"
      data-testid={testId || "standard-modal-overlay"}
      onClick={() => {
        if (!preventBackdropClick) {
          onClose();
        }
      }}
    >
      <div
        ref={contentRef}
        className={`relative w-full ${maxWidthClassName} max-h-[92vh] flex flex-col rounded-3xl border border-border bg-card text-foreground shadow-2xl text-right my-auto overflow-hidden animate-[toast-in_.2s_ease_both] ${className}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-20 rounded-full border border-border bg-background/90 p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={closeButtonAriaLabel}
            data-testid="button-close-standard-modal"
          >
            <X size={18} />
          </button>
        )}

        {!hideHeader && (title || subtitle) && (
          <div className="border-b border-border px-6 pt-6 pb-4 sm:px-8 shrink-0">
            {title && (
              <h3 className="text-xl font-extrabold text-foreground sm:text-2xl">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground leading-5">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="overflow-y-auto p-6 sm:p-8 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
