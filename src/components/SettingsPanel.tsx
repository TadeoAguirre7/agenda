"use client";

import { useEffect, useState } from "react";

type Size = "small" | "normal" | "large";

const CLASS_MAP: Record<Size, string> = {
  small: "text-sm",
  normal: "text-base",
  large: "text-lg",
};

function applyFontSize(size: Size) {
  const html = document.documentElement;
  html.classList.remove("text-sm", "text-base", "text-lg");
  html.classList.add(CLASS_MAP[size]);
  try {
    localStorage.setItem("font-size", size);
  } catch {
    // ignore
  }
}

function currentSize(): Size {
  let s: string | null = null;
  try {
    s = localStorage.getItem("font-size");
  } catch {
    // ignore
  }
  if (s === "small" || s === "large") return s;
  return "normal";
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<Size>(() => currentSize());

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function choose(s: Size) {
    setSize(s);
    applyFontSize(s);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ajustes"
        title="Ajustes"
        className="rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint transition hover:bg-ink/5"
      >
        ⚙
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-rule bg-panel p-4 shadow-lg">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-ink">
              Ajustes
            </span>
            <button
              onClick={() => setOpen(false)}
              className="font-mono text-xs text-faint hover:text-alta"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            Tamaño de letra
          </div>
          <div className="flex gap-2">
            {(["small", "normal", "large"] as Size[]).map((s) => (
              <button
                key={s}
                onClick={() => choose(s)}
                className={`flex-1 rounded-full border px-2 py-1.5 font-mono text-xs transition ${
                  size === s
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-faint hover:border-ink"
                }`}
              >
                {s === "small"
                  ? "Pequeña"
                  : s === "large"
                    ? "Grande"
                    : "Normal"}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint/70">
            Se guarda en este dispositivo
          </p>
        </div>
      )}
    </div>
  );
}
