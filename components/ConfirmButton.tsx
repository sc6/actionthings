"use client";

import { useEffect, useRef, useState } from "react";

const DISARM_AFTER_MS = 4000;
// Ignore the second click of a double-click, so one gesture can't arm and confirm.
const MIN_CONFIRM_DELAY_MS = 400;

/**
 * Submit button for destructive actions, confirmed inline without a dialog:
 * the first click arms it (red, `confirmLabel`), a second click submits. It
 * disarms after a few seconds, on Escape, or on a click anywhere else.
 */
export function ConfirmButton({
  message,
  className = "danger",
  title,
  confirmLabel = "confirm?",
  showMessage = false,
  children,
}: {
  /** What will happen; shown beside the button when `showMessage`, otherwise as its tooltip. */
  message: string;
  className?: string;
  title?: string;
  confirmLabel?: string;
  showMessage?: boolean;
  children: React.ReactNode;
}) {
  const [armedAt, setArmedAt] = useState<number | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const armed = armedAt !== null;

  useEffect(() => {
    if (!armed) return;
    const disarm = () => setArmedAt(null);
    const timer = setTimeout(disarm, DISARM_AFTER_MS);
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) disarm();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") disarm();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed]);

  return (
    <>
      <button
        ref={ref}
        type="submit"
        className={`${className}${armed ? " armed" : ""}`}
        title={armed ? message : (title ?? message)}
        aria-label={armed ? `${message} Click again to confirm.` : undefined}
        onClick={(e) => {
          if (!armed) {
            e.preventDefault();
            setArmedAt(Date.now());
          } else if (Date.now() - armedAt < MIN_CONFIRM_DELAY_MS) {
            e.preventDefault();
          }
        }}
      >
        {armed ? confirmLabel : children}
      </button>
      {armed && showMessage && (
        <span className="confirm-message" role="status">
          {message} click again to confirm.
        </span>
      )}
    </>
  );
}
