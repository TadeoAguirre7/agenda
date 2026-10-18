"use client";

import { useEffect, useState } from "react";
import { fmtDuracion } from "@/components/DuracionPicker";

export function IconoTacho({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" />
    </svg>
  );
}

// franja roja a la derecha para eliminar (pide confirmación arriba)
export function BotonEliminar({
  titulo,
  onClick,
  className = "",
}: {
  titulo: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Eliminar ${titulo}`}
      title="Eliminar"
      className={`flex shrink-0 items-center justify-center bg-peligro/10 text-peligro transition hover:bg-peligro hover:text-paper focus-visible:bg-peligro focus-visible:text-paper focus-visible:outline-none ${className}`}
    >
      <IconoTacho className="h-4 w-4" />
    </button>
  );
}

export type BloqueTimeline = {
  id: string;
  titulo: string;
  color: string;
  ini: number; // minutos desde 00:00
  dur: number | null; // null = sin duración (marca puntual)
  etiqueta?: string; // ej. recurrencia
};

const PX_HORA = 56;
const MIN_ALTO = 24;
const pad = (n: number) => n.toString().padStart(2, "0");
const hm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

// Reparte bloques superpuestos en columnas (estilo Google Calendar)
function columnas(bloques: BloqueTimeline[]) {
  const fin = (b: BloqueTimeline) =>
    b.ini + Math.max(b.dur ?? 0, (MIN_ALTO / PX_HORA) * 60);
  const orden = [...bloques].sort((a, b) => a.ini - b.ini || fin(b) - fin(a));
  const out = new Map<string, { col: number; cols: number }>();
  let grupo: BloqueTimeline[] = [];
  let finGrupo = -1;
  let colsFin: number[] = [];

  const cerrar = () => {
    const n = colsFin.length;
    grupo.forEach((b) => (out.get(b.id)!.cols = n));
    grupo = [];
    colsFin = [];
  };

  for (const b of orden) {
    if (b.ini >= finGrupo) cerrar();
    let col = colsFin.findIndex((f) => f <= b.ini);
    if (col === -1) {
      col = colsFin.length;
      colsFin.push(fin(b));
    } else colsFin[col] = fin(b);
    out.set(b.id, { col, cols: 1 });
    grupo.push(b);
    finGrupo = Math.max(finGrupo, fin(b));
  }
  cerrar();
  return out;
}

export type ItemTodoElDia = {
  id: string;
  titulo: string;
  color: string;
  etiqueta?: string;
};

export default function DayTimeline({
  bloques,
  todoElDia = [],
  mostrarAhora,
  onCompletar,
  onEditar,
  onBorrar,
}: {
  bloques: BloqueTimeline[];
  todoElDia?: ItemTodoElDia[];
  mostrarAhora: boolean;
  onCompletar: (id: string) => void;
  onEditar: (id: string) => void;
  onBorrar: (id: string) => void;
}) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    if (!mostrarAhora) return;
    const tick = () => {
      const d = new Date();
      setAhora(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [mostrarAhora]);

  // rango visible: 7 a 22 por defecto, ampliado si hay tareas fuera
  const desde = Math.min(7, ...bloques.map((b) => Math.floor(b.ini / 60)));
  const hasta = Math.max(
    22,
    ...bloques.map((b) => Math.ceil((b.ini + (b.dur ?? 30)) / 60)),
  );
  const horas = Array.from({ length: Math.min(hasta, 24) - desde }, (_, i) => desde + i);
  const y = (min: number) => ((min - desde * 60) / 60) * PX_HORA;
  const cols = columnas(bloques);

  return (
    <div>
      {/* fila "todo el día": tareas sin hora, como en Google Calendar */}
      <div className="mb-3 flex min-h-8 items-start gap-2 border-b border-rule pb-2">
        <span className="w-10 shrink-0 pt-1 text-right font-mono text-[9px] uppercase leading-tight text-faint">
          todo el día
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {todoElDia.length === 0 && (
            <span className="pt-1 font-mono text-[10px] text-faint/60">—</span>
          )}
          {todoElDia.map((t) => (
            <div
              key={t.id}
              className="flex max-w-full items-stretch gap-1.5 overflow-hidden rounded-md border-l-3 pl-2"
              style={{
                borderColor: t.color,
                background: `color-mix(in srgb, ${t.color} 12%, var(--panel))`,
              }}
            >
              <button
                type="button"
                aria-label={`Completar ${t.titulo}`}
                onClick={() => onCompletar(t.id)}
                className="my-auto h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] bg-panel transition hover:border-ink"
                style={{ borderColor: t.color }}
              />
              <button
                type="button"
                onClick={() => onEditar(t.id)}
                title="Editar"
                className="min-w-0 truncate py-1 text-left text-sm text-ink"
              >
                {t.titulo}
                {t.etiqueta && (
                  <span className="ml-1.5 font-mono text-[10px] text-faint">
                    {t.etiqueta}
                  </span>
                )}
              </button>
              <BotonEliminar
                titulo={t.titulo}
                onClick={() => onBorrar(t.id)}
                className="ml-1 w-7"
              />
            </div>
          ))}
        </div>
      </div>

    <div
      className="relative ml-12"
      style={{ height: horas.length * PX_HORA }}
      aria-label="Franjas horarias del día"
    >
      {horas.map((h) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-rule"
          style={{ top: y(h * 60) }}
        >
          <span className="absolute -left-12 -top-2 w-10 text-right font-mono text-[10px] text-faint">
            {pad(h)}:00
          </span>
        </div>
      ))}

      {mostrarAhora && ahora !== null && ahora >= desde * 60 && ahora < hasta * 60 && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
          style={{ top: y(ahora) }}
          aria-hidden
        >
          <span className="-ml-1 h-2 w-2 rounded-full bg-alta" />
          <span className="h-px flex-1 bg-alta" />
        </div>
      )}

      {bloques.map((b) => {
        const { col, cols: n } = cols.get(b.id)!;
        const alto = Math.max(MIN_ALTO, ((b.dur ?? 0) / 60) * PX_HORA);
        const compacto = alto < 40;
        return (
          <div
            key={b.id}
            className="group absolute flex items-center gap-2.5 overflow-hidden rounded-md border-l-3 py-1 pl-2 transition hover:z-20 hover:shadow-md"
            style={{
              top: y(b.ini),
              height: alto,
              left: `calc(${(col / n) * 100}% + 2px)`,
              width: `calc(${100 / n}% - 4px)`,
              borderColor: b.color,
              background: b.dur
                ? `color-mix(in srgb, ${b.color} 12%, var(--panel))`
                : "transparent",
            }}
          >
            <button
              type="button"
              aria-label={`Completar ${b.titulo}`}
              onClick={() => onCompletar(b.id)}
              className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] bg-panel transition hover:border-ink"
              style={{ borderColor: b.color }}
            />
            <button
              type="button"
              onClick={() => onEditar(b.id)}
              className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left"
              title="Editar"
            >
              <span
                className={`min-w-0 flex-1 ${compacto ? "flex items-baseline gap-2" : ""}`}
              >
              <span className="block truncate text-sm leading-tight text-ink">
                {b.titulo}
              </span>
              <span className="block truncate font-mono text-[10px] text-faint">
                {hm(b.ini)}
                {b.dur ? `–${hm(b.ini + b.dur)} · ${fmtDuracion(b.dur)}` : ""}
                {b.etiqueta ? ` · ${b.etiqueta}` : ""}
              </span>
              </span>
              <span className="hidden shrink-0 font-mono text-[10px] text-faint sm:inline">
                click para editar
              </span>
            </button>
            <BotonEliminar
              titulo={b.titulo}
              onClick={() => onBorrar(b.id)}
              className="-my-1 w-9 self-stretch"
            />
          </div>
        );
      })}
    </div>
    </div>
  );
}
