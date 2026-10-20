"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Size = "small" | "normal" | "large";

const CLASS_MAP: Record<Size, string> = {
  small: "text-sm",
  normal: "text-base",
  large: "text-lg",
};

const BG_LEGACY_KEY = "bg-image"; // fondo viejo guardado solo en el dispositivo
const BG_URL_KEY = "bg-url"; // espejo local de la URL, para pintarlo antes de hidratar
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

type Tema = "light" | "dark" | "system";

function aplicarTema(t: Tema) {
  const html = document.documentElement;
  if (t === "system") delete html.dataset.theme;
  else html.dataset.theme = t;
  try {
    localStorage.setItem("theme", t);
  } catch {
    // ignore
  }
}

// lo guardado en este dispositivo (sin elección = claro)
function temaActual(): Tema {
  if (typeof window === "undefined") return "light";
  try {
    const t = localStorage.getItem("theme");
    return t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

// Fondo de la cuenta: /api/user/background?v=<versión>. body::before lo usa.
function applyBg(version: number | null) {
  try {
    if (version) {
      const url = `/api/user/background?v=${version}`;
      document.body.style.setProperty("--bg-custom", `url("${url}")`);
      localStorage.setItem(BG_URL_KEY, url);
    } else {
      document.body.style.removeProperty("--bg-custom");
      localStorage.removeItem(BG_URL_KEY);
    }
  } catch {
    // ignore
  }
}

async function subirFondo(dataUrl: string): Promise<number | null> {
  const res = await fetch("/api/user/background", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  return typeof data?.version === "number" ? data.version : null;
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

export default function SettingsPanel({
  onSecciones,
  fondoVersion,
}: {
  onSecciones: () => void;
  fondoVersion: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [tema, setTema] = useState<Tema>(temaActual);
  const [size, setSize] = useState<Size>(() => currentSize());
  const [version, setVersion] = useState<number | null>(fondoVersion);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFondo, setErrorFondo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applyBg(version);
  }, [version]);

  // Migración: si este dispositivo tenía un fondo local y la cuenta no tiene
  // uno, se sube a la cuenta una sola vez.
  useEffect(() => {
    let legado: string | null = null;
    try {
      legado = localStorage.getItem(BG_LEGACY_KEY);
    } catch {
      return;
    }
    if (!legado) return;
    if (fondoVersion) {
      localStorage.removeItem(BG_LEGACY_KEY);
      return;
    }
    subirFondo(legado).then((v) => {
      if (v) {
        localStorage.removeItem(BG_LEGACY_KEY);
        setVersion(v);
      }
    });
  }, [fondoVersion]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const cerrar = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", cerrar);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", cerrar);
    };
  }, []);

  function choose(s: Size) {
    setSize(s);
    applyFontSize(s);
    setOpen(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setErrorFondo(null);
    try {
      const v = await subirFondo(await compressImage(file));
      if (v) setVersion(v);
      else setErrorFondo("No se pudo guardar la foto. Probá con otra o revisá tu conexión.");
    } catch {
      setErrorFondo("No se pudo leer la imagen.");
    }
    setSubiendo(false);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  async function removeBg() {
    const antes = version;
    setVersion(null);
    const res = await fetch("/api/user/background", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setVersion(antes);
      setErrorFondo("No se pudo quitar el fondo. Intentá de nuevo.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          setAnchor(e.currentTarget.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        aria-label="Ajustes"
        aria-expanded={open}
        title="Ajustes"
        className={`rounded-full p-2 text-xl leading-none transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink ${open ? "bg-ink/5 text-ink" : "text-faint"}`}
      >
        ⚙
      </button>
      {open &&
        anchor &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <div
              role="dialog"
              aria-label="Ajustes"
              className="fixed z-[100] w-[272px] rounded-xl border border-rule bg-panel p-4 shadow-lg"
              style={{
                top: anchor.bottom + 10,
                // alineado a la derecha del engranaje, sin salirse de pantalla
                left: Math.max(
                  8,
                  Math.min(anchor.right - 272 + 8, window.innerWidth - 272 - 8),
                ),
              }}
            >
              {/* piquito apuntando al engranaje */}
              <span
                aria-hidden
                className="absolute -top-[6px] h-3 w-3 rotate-45 border-l border-t border-rule bg-panel"
                style={{
                  left:
                    anchor.left +
                    anchor.width / 2 -
                    Math.max(
                      8,
                      Math.min(anchor.right - 272 + 8, window.innerWidth - 272 - 8),
                    ) -
                    6,
                }}
              />
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
                  Ajustes
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="-mr-1 rounded-full px-1.5 font-mono text-xs text-faint hover:text-ink"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                Tema
              </div>
              <div
                role="radiogroup"
                aria-label="Tema"
                className="mb-5 grid grid-cols-3 rounded-full border border-rule p-0.5"
              >
                {(
                  [
                    { t: "light", label: "Claro", icono: "☀" },
                    { t: "dark", label: "Oscuro", icono: "☾" },
                    { t: "system", label: "Sistema", icono: "◐" },
                  ] as const
                ).map(({ t, label, icono }) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={tema === t}
                    onClick={() => {
                      setTema(t);
                      aplicarTema(t);
                    }}
                    className={`rounded-full py-1.5 font-mono text-xs transition ${
                      tema === t ? "bg-ink text-paper" : "text-faint hover:text-ink"
                    }`}
                  >
                    <span aria-hidden>{icono}</span> {label}
                  </button>
                ))}
              </div>

              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                Tamaño de letra
              </div>
              <div
                role="radiogroup"
                aria-label="Tamaño de letra"
                className="grid grid-cols-3 rounded-full border border-rule p-0.5"
              >
                {(["small", "normal", "large"] as Size[]).map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={size === s}
                    onClick={() => choose(s)}
                    className={`rounded-full py-1.5 font-mono text-xs transition ${
                      size === s
                        ? "bg-ink text-paper"
                        : "text-faint hover:text-ink"
                    }`}
                  >
                    <span
                      className={
                        s === "small" ? "text-[10px]" : s === "large" ? "text-sm" : ""
                      }
                    >
                      Aa
                    </span>{" "}
                    {s === "small" ? "Chica" : s === "large" ? "Grande" : "Normal"}
                  </button>
                ))}
              </div>

              <div className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-wider text-faint">
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
                  disabled={subiendo}
                  className="flex-1 rounded-full border border-rule px-2 py-1.5 font-mono text-xs text-ink transition hover:border-ink"
                >
                  {subiendo ? "Guardando…" : version ? "Cambiar foto" : "Elegir foto"}
                </button>
                {version && (
                  <button
                    onClick={removeBg}
                    className="rounded-full border border-rule px-3 py-1.5 font-mono text-xs text-faint transition hover:border-peligro hover:text-peligro"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <p className="mt-2 font-mono text-[10px] text-faint/80">
                {errorFondo ?? "Se guarda en tu cuenta: lo ves igual en todos tus dispositivos."}
              </p>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSecciones();
                }}
                className="mt-5 flex w-full items-center justify-between border-t border-rule pt-4 text-left"
              >
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">
                    Secciones
                  </span>
                  <span className="block text-xs text-ink">Elegí qué secciones usar</span>
                </span>
                <span aria-hidden className="font-mono text-sm text-faint">›</span>
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
