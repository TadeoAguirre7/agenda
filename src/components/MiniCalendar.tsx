"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const pad = (n: number) => n.toString().padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const DOW = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

// Calendario propio (el picker nativo no se cerraba en desktop).
// Posición fija para no quedar recortado por el overflow del header.
export default function MiniCalendar({
  value,
  hoy,
  onChange,
  onClose,
  anchor,
}: {
  value: string;
  hoy: string;
  onChange: (dia: string) => void;
  onClose: () => void;
  anchor: DOMRect;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [y0, m0] = value.split("-").map(Number);
  const [vista, setVista] = useState({ y: y0, m: m0 - 1 });

  useEffect(() => {
    function fuera(e: PointerEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      // el botón que lo abrió maneja su propio toggle
      const enAncla =
        e.clientX >= anchor.left &&
        e.clientX <= anchor.right &&
        e.clientY >= anchor.top &&
        e.clientY <= anchor.bottom;
      if (!enAncla) onClose();
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    // fijo en pantalla: si se scrollea queda despegado del botón, mejor cerrar
    window.addEventListener("scroll", onClose, { passive: true });
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, anchor]);

  const primero = new Date(vista.y, vista.m, 1);
  const offset = (primero.getDay() + 6) % 7; // lunes primero
  const diasMes = new Date(vista.y, vista.m + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ];
  const titulo = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(primero);

  const mover = (n: number) =>
    setVista(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  // abre abajo; si no entra, arriba; si tampoco, pegado al borde visible
  const [top, setTop] = useState(anchor.bottom + 8);
  useLayoutEffect(() => {
    const alto = ref.current?.offsetHeight ?? 0;
    const margen = 8;
    const abajo = anchor.bottom + margen;
    const arriba = anchor.top - margen - alto;
    if (abajo + alto <= window.innerHeight - margen) setTop(abajo);
    else if (arriba >= margen) setTop(arriba);
    else setTop(Math.max(margen, window.innerHeight - alto - margen));
  }, [anchor, vista]);

  const ancho = 248;
  const left = Math.min(
    Math.max(8, anchor.right - ancho),
    window.innerWidth - ancho - 8,
  );

  // portal a <body>: el header usa backdrop-blur, que rompe `position: fixed`
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Elegir fecha"
      className="fixed z-[100] rounded-xl border border-rule bg-panel p-3 shadow-lg"
      style={{ top, left, width: ancho }}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label="Mes anterior"
          className="rounded px-2 font-mono text-sm text-faint hover:text-ink"
        >
          ‹
        </button>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
          {titulo}
        </span>
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label="Mes siguiente"
          className="rounded px-2 font-mono text-sm text-faint hover:text-ink"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DOW.map((d) => (
          <span
            key={d}
            className="py-1 font-mono text-[10px] uppercase text-faint"
          >
            {d}
          </span>
        ))}
        {celdas.map((d, i) => {
          if (d === null) return <span key={`v${i}`} />;
          const dia = iso(vista.y, vista.m, d);
          const sel = dia === value;
          const esHoy = dia === hoy;
          return (
            <button
              key={dia}
              type="button"
              onClick={() => {
                onChange(dia);
                onClose();
              }}
              className={`aspect-square rounded-full font-mono text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                sel
                  ? "bg-ink text-paper"
                  : esHoy
                    ? "text-ink underline decoration-2 underline-offset-4"
                    : "text-ink/80 hover:bg-ink/5"
              }`}
              aria-current={esHoy ? "date" : undefined}
              aria-pressed={sel}
            >
              {d}
            </button>
          );
        })}
      </div>

      {value !== hoy && (
        <button
          type="button"
          onClick={() => {
            onChange(hoy);
            onClose();
          }}
          className="mt-2 w-full rounded-full border border-rule py-1 font-mono text-[10px] uppercase tracking-wider text-faint hover:border-ink hover:text-ink"
        >
          Ir a hoy
        </button>
      )}
    </div>
  ,
    document.body,
  );
}
