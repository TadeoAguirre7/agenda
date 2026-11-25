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

const PX_HORA = 56; // alto del tramo proporcional de cada hora
const FILA = 34; // alto de cada tarea sin duración (fila bajo su hora)
const MIN_ALTO = 28;
const MAX_COLS = 2; // más bloques superpuestos que esto -> chip "+N"
const pad = (n: number) => n.toString().padStart(2, "0");
const hm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

// Reparte bloques con duración superpuestos en columnas (estilo Google Calendar)
function columnas(bloques: BloqueTimeline[]) {
  const fin = (b: BloqueTimeline) => b.ini + Math.max(b.dur ?? 0, 15);
  const orden = [...bloques].sort((a, b) => a.ini - b.ini || fin(b) - fin(a));
  const out = new Map<string, { col: number; cols: number; grupo: number }>();
  let grupo: BloqueTimeline[] = [];
  let nGrupo = 0;
  let finGrupo = -1;
  let colsFin: number[] = [];

  const cerrar = () => {
    const n = colsFin.length;
    grupo.forEach((b) => (out.get(b.id)!.cols = n));
    grupo = [];
    colsFin = [];
    nGrupo++;
  };

  for (const b of orden) {
    if (b.ini >= finGrupo) cerrar();
    let col = colsFin.findIndex((f) => f <= b.ini);
    if (col === -1) {
      col = colsFin.length;
      colsFin.push(fin(b));
    } else colsFin[col] = fin(b);
    out.set(b.id, { col, cols: 1, grupo: nGrupo });
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

function Check({ titulo, color, onClick }: { titulo: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Completar ${titulo}`}
      onClick={onClick}
      className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] bg-panel transition hover:border-ink"
      style={{ borderColor: color }}
    />
  );
}

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
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
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

  // Con duración -> bloque proporcional. Sin duración -> fila bajo su hora.
  const eventos = bloques.filter((b) => b.dur && b.dur > 0);
  const puntos = bloques.filter((b) => !b.dur).sort((a, b) => a.ini - b.ini);

  // rango visible: 7 a 22 por defecto, ampliado si hay tareas fuera
  const desde = Math.min(7, ...bloques.map((b) => Math.floor(b.ini / 60)));
  const hasta = Math.min(
    24,
    Math.max(22, ...bloques.map((b) => Math.ceil((b.ini + (b.dur || 1)) / 60))),
  );
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);

  // cada hora = filas de sus tareas sin duración + tramo proporcional
  const filasPorHora = new Map<number, BloqueTimeline[]>();
  puntos.forEach((p) => {
    const h = Math.floor(p.ini / 60);
    filasPorHora.set(h, [...(filasPorHora.get(h) ?? []), p]);
  });
  const altoFilas = (h: number) => (filasPorHora.get(h)?.length ?? 0) * FILA;
  const topHora = new Map<number, number>();
  let acc = 0;
  horas.forEach((h) => {
    topHora.set(h, acc);
    acc += altoFilas(h) + PX_HORA;
  });
  const altoTotal = acc;
  const y = (min: number) => {
    const h = Math.min(Math.max(Math.floor(min / 60), desde), hasta - 1);
    const dentro = Math.min(Math.max(min - h * 60, 0), 60);
    return topHora.get(h)! + altoFilas(h) + (dentro / 60) * PX_HORA;
  };

  const cols = columnas(eventos);
  // bloques que vienen de una hora anterior y tapan las filas de esta hora
  const tapadoHasta = (h: number) => {
    let frac = 0;
    eventos.forEach((e) => {
      if (e.ini < h * 60 && e.ini + (e.dur ?? 0) > h * 60) {
        const { col, cols: n, grupo } = cols.get(e.id)!;
        const vis = n > MAX_COLS && !expandidos.has(grupo) ? MAX_COLS + 1 : n;
        frac = Math.max(frac, (Math.min(col, vis - 1) + 1) / vis);
      }
    });
    return frac;
  };

  const chipsMas = new Map<number, { top: number; ocultos: number }>();

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
              <span className="my-auto flex">
                <Check titulo={t.titulo} color={t.color} onClick={() => onCompletar(t.id)} />
              </span>
              <button
                type="button"
                onClick={() => onEditar(t.id)}
                title="Editar"
                className="min-w-0 truncate py-1 pr-2 text-left text-sm text-ink"
              >
                {t.titulo}
                {t.etiqueta && (
                  <span className="ml-1.5 font-mono text-[10px] text-faint">{t.etiqueta}</span>
                )}
              </button>
              <BotonEliminar
                titulo={t.titulo}
                onClick={() => onBorrar(t.id)}
                className="hidden w-7 sm:flex"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="relative ml-12"
        style={{ height: altoTotal }}
        aria-label="Franjas horarias del día"
      >
        {horas.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 border-t border-rule"
            style={{ top: topHora.get(h) }}
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
            <span className="-ml-1 h-2 w-2 rounded-full bg-peligro" />
            <span className="h-px flex-1 bg-peligro" />
          </div>
        )}

        {/* tareas sin duración: una fila cada una, bajo su hora */}
        {horas.flatMap((h) => {
          const frac = tapadoHasta(h);
          return (filasPorHora.get(h) ?? []).map((p, k) => (
            <div
              key={p.id}
              className="group absolute flex items-center gap-2.5 overflow-hidden rounded-md pl-1.5"
              style={{
                top: topHora.get(h)! + k * FILA + 3,
                height: FILA - 4,
                left: `calc(${frac * 100}% + ${frac ? 6 : 2}px)`,
                right: 2,
              }}
            >
              <span
                aria-hidden
                className="h-full w-[3px] shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <Check titulo={p.titulo} color={p.color} onClick={() => onCompletar(p.id)} />
              <button
                type="button"
                onClick={() => onEditar(p.id)}
                title="Editar"
                className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
              >
                <span className="truncate text-sm text-ink">{p.titulo}</span>
                <span className="shrink-0 font-mono text-[10px] text-faint">
                  {hm(p.ini)}
                  {p.etiqueta ? ` · ${p.etiqueta}` : ""}
                </span>
              </button>
              <BotonEliminar
                titulo={p.titulo}
                onClick={() => onBorrar(p.id)}
                className="hidden h-full w-8 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 sm:flex"
              />
            </div>
          ));
        })}

        {/* tareas con duración: bloque proporcional */}
        {eventos.map((b) => {
          const { col, cols: n, grupo } = cols.get(b.id)!;
          const colapsado = n > MAX_COLS && !expandidos.has(grupo);
          if (colapsado && col >= MAX_COLS) {
            const top = y(b.ini);
            const chip = chipsMas.get(grupo);
            chipsMas.set(grupo, {
              top: chip ? Math.min(chip.top, top) : top,
              ocultos: (chip?.ocultos ?? 0) + 1,
            });
            return null;
          }
          // colapsado: 2 columnas visibles + angosta para el chip
          const vis = colapsado ? MAX_COLS + 1 : n;
          const ancho = colapsado ? `(100% - 44px) / ${MAX_COLS}` : `100% / ${n}`;
          const top = y(b.ini);
          const alto = Math.max(MIN_ALTO, y(b.ini + (b.dur ?? 0)) - top);
          const compacto = alto < 44 || vis > 1;
          return (
            <div
              key={b.id}
              className="group absolute flex items-start gap-2 overflow-hidden rounded-md border-l-3 py-1 pl-2 transition hover:z-20 hover:shadow-md"
              style={{
                top,
                height: alto,
                left: `calc(${ancho} * ${col} + 2px)`,
                width: `calc(${ancho} - 4px)`,
                borderColor: b.color,
                background: `color-mix(in srgb, ${b.color} 14%, var(--panel))`,
              }}
            >
              <span className="flex pt-0.5">
                <Check titulo={b.titulo} color={b.color} onClick={() => onCompletar(b.id)} />
              </span>
              <button
                type="button"
                onClick={() => onEditar(b.id)}
                className="min-w-0 flex-1 self-stretch text-left"
                title="Editar"
              >
                <span className="block truncate text-sm leading-tight text-ink">{b.titulo}</span>
                <span className="block truncate font-mono text-[10px] text-faint">
                  {hm(b.ini)}–{hm(b.ini + (b.dur ?? 0))}
                  {!compacto && ` · ${fmtDuracion(b.dur ?? 0)}`}
                  {b.etiqueta ? ` · ${b.etiqueta}` : ""}
                </span>
              </button>
              {!compacto && (
                <BotonEliminar
                  titulo={b.titulo}
                  onClick={() => onBorrar(b.id)}
                  className="-my-1 hidden w-9 self-stretch sm:flex"
                />
              )}
            </div>
          );
        })}

        {/* "+N": bloques superpuestos que no entran */}
        {[...chipsMas].map(([grupo, c]) => (
          <button
            key={`mas-${grupo}`}
            type="button"
            onClick={() => setExpandidos((s) => new Set(s).add(grupo))}
            aria-label={`Ver ${c.ocultos} tareas más`}
            className="absolute flex items-center justify-center rounded-md border border-rule bg-panel font-mono text-xs text-ink shadow-sm hover:border-ink"
            style={{ top: c.top, right: 2, width: 40, height: MIN_ALTO }}
          >
            +{c.ocultos}
          </button>
        ))}
      </div>
    </div>
  );
}
