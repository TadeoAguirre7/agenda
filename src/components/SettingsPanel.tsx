"use client";

import { useEffect, useRef, useState } from "react";

type Size = "small" | "normal" | "large";

const CLASS_MAP: Record<Size, string> = {
  small: "text-sm",
  normal: "text-base",
  large: "text-lg",
};

const BG_KEY = "bg-image";
const MAX_W = 1920;
const MAX_H = 1920;
const QUALITY = 0.7;

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

function applyBg(dataUrl: string | null) {
  // Sets --bg-custom on body; body::before in globals.css uses it
  if (dataUrl) {
    document.body.style.setProperty("--bg-custom", `url(${dataUrl})`);
  } else {
    document.body.style.removeProperty("--bg-custom");
  }
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_W || height > MAX_H) {
          const ratio = Math.min(MAX_W / width, MAX_H / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas ctx"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", QUALITY));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<Size>(() => currentSize());
  const [hasBg, setHasBg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Apply saved bg on mount
    try {
      const saved = localStorage.getItem(BG_KEY);
      if (saved) {
        applyBg(saved);
        setHasBg(true);
      }
    } catch {
      // ignore
    }
  }, []);

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      localStorage.setItem(BG_KEY, dataUrl);
      applyBg(dataUrl);
      setHasBg(true);
    } catch {
      // ignore
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function removeBg() {
    try {
      localStorage.removeItem(BG_KEY);
    } catch {
      // ignore
    }
    applyBg(null);
    setHasBg(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ajustes"
        title="Ajustes"
        className="rounded-full p-2 text-xl leading-none text-faint transition hover:bg-ink/5"
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

          {/* Font size */}
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

          {/* Background image */}
          <div className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            Fondo de pantalla
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-full border border-rule px-2 py-1.5 font-mono text-xs text-faint transition hover:border-ink hover:text-ink"
            >
              {hasBg ? "Cambiar" : "Elegir foto"}
            </button>
            {hasBg && (
              <button
                onClick={removeBg}
                className="rounded-full border border-rule px-2 py-1.5 font-mono text-xs text-faint transition hover:border-alta hover:text-alta"
              >
                Quitar
              </button>
            )}
          </div>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint/70">
            Se guarda en este dispositivo
          </p>
        </div>
      )}
    </div>
  );
}
