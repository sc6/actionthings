"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button with quiet feedback: dims while its form is saving, then
 * glows once when the save completes. Must be rendered inside the <form>.
 */
export function SaveButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(0);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) setSaved((n) => n + 1);
    wasPending.current = pending;
  }, [pending]);

  return (
    <button
      // A new key restarts the CSS animation on every completed save.
      key={saved}
      type="submit"
      aria-busy={pending}
      className={`${className}${pending ? " saving" : ""}${saved ? " saved" : ""}`}
    >
      {children}
    </button>
  );
}
