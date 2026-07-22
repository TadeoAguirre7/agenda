"use client";

import { useEffect, useRef, useState } from "react";

const PALETA = [
  "#3e4e72", "#5b6f95", "#7a8baa", "#6e83ad", "#8fa3c8", "#b9c4d8",
  "#c94f4f", "#e07a5f", "#e9c46a", "#f4a261", "#2a9d8f", "#43aa8b",
  "#9b5de5", "#f15bb5", "#e63946", "#f3722c", "#00bbf9", "#6d6875",
];

export default function ColorDot({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative ml-1 inline-flex">
      <button
        type="button"
        aria-label={`Color de ${label}`}
        title={`Cambiar color: ${label}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-4 w-4 rounded-full border border-ink/20 transition hover:scale-110"
        style={{ background: color }}
      />

      {open && (
        <span
          className="absolute right-0 top-full z-50 mt-2 block w-44 rounded-md border border-rule bg-panel p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="grid grid-cols-6 gap-1.5">
            {PALETA.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Elegir ${c}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(c);
                  setOpen(false);
                }}
                className="h-5 w-5 rounded-full transition hover:scale-110"
                style={{
                  background: c,
                  boxShadow:
                    c === color ? "0 0 0 2px var(--paper), 0 0 0 4px var(--ink)" : undefined,
                }}
              />
            ))}
          </span>
          <label
            className="mt-2 flex items-center justify-between gap-2 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-wider text-faint"
            onClick={(e) => e.stopPropagation()}
          >
            otro color
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="h-5 w-8 cursor-pointer"
              aria-label={`Color personalizado de ${label}`}
            />
          </label>
        </span>
      )}
    </span>
  );
}
