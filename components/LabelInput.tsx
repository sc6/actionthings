"use client";

import { useEffect, useRef, useState } from "react";
import type { Label } from "@/lib/repo";

// The page remounts this component (via `key`) after a label is added; this
// restores focus (to the input that submitted) so several can be typed in a row.
let refocus: string | null = null;

/**
 * Text input with typeahead over existing labels, submitted as `name` to
 * `action` along with `fields`. Submitting a name that doesn't exist creates
 * the label. Render with a `key` that changes when the labels change, so the
 * input clears after each add.
 */
export function LabelInput({
  action,
  fields,
  suggestions,
  placeholder = "+ label",
  focusKey,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  suggestions: Label[];
  placeholder?: string;
  /** Unique per input on the page; used for focus restoration and ARIA ids. */
  focusKey: string;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (refocus === focusKey) {
      inputRef.current?.focus();
      refocus = null;
    }
  }, [focusKey]);

  const typed = value.trim().replace(/^#/, "");
  const query = typed.toLowerCase();
  const matches = query
    ? suggestions
        .filter((s) => s.name.toLowerCase().includes(query))
        .sort((a, b) => +!a.name.toLowerCase().startsWith(query) - +!b.name.toLowerCase().startsWith(query))
    : suggestions;
  const showCreate = query !== "" && !suggestions.some((s) => s.name.toLowerCase() === query);
  // Options: matching labels, then "create" when the name is new.
  const count = matches.length + (showCreate ? 1 : 0);

  const pick = (name: string) => {
    setValue(name);
    setOpen(false);
    setActive(-1);
    // Let React flush the new value into the input before submitting.
    requestAnimationFrame(() => inputRef.current?.form?.requestSubmit());
  };

  return (
    <form action={action} onSubmit={() => (refocus = focusKey)} className="inline-form">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <span className="typeahead">
        <input
          ref={inputRef}
          type="text"
          name="name"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          required
          role="combobox"
          aria-expanded={open && count > 0}
          aria-controls={`${focusKey}-suggestions`}
          onChange={(e) => {
            setValue(e.target.value.toLowerCase());
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && count > 0) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (i + 1) % count);
            } else if (e.key === "ArrowUp" && count > 0) {
              e.preventDefault();
              setActive((i) => (i <= 0 ? count - 1 : i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            } else if ((e.key === "Enter" || e.key === "Tab") && open && active >= 0 && active < matches.length) {
              e.preventDefault();
              pick(matches[active].name);
            }
          }}
        />
        {open && count > 0 && (
          <ul id={`${focusKey}-suggestions`} className="suggestions" role="listbox">
            {matches.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s.name);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="ok">#{s.name}</span>
              </li>
            ))}
            {showCreate && (
              <li
                role="option"
                aria-selected={active === matches.length}
                className={active === matches.length ? "active" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(typed);
                }}
                onMouseEnter={() => setActive(matches.length)}
              >
                <span className="warn">+ create</span> <span className="ok">#{typed}</span>
              </li>
            )}
          </ul>
        )}
      </span>
    </form>
  );
}
