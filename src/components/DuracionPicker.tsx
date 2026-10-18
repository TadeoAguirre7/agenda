"use client";

import { useState } from "react";

const PRESETS = [15, 30, 60, 90, 120];

export function fmtDuracion(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

// Acepta "45", "45m", "1h", "1h30", "1:30", "1.5h", "2 h 15". Devuelve minutos o null.
export function parseDuracion(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
  if (!s) return null;
  let min: number | null = null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d+):([0-5]\d)$/.exec(s))) {
    min = Number(m[1]) * 60 + Number(m[2]);
  } else if ((m = /^(\d+(?:\.\d+)?)h(?:(\d{1,2})m?)?$/.exec(s))) {
    min = Math.round(Number(m[1]) * 60) + Number(m[2] ?? 0);
  } else if ((m = /^(\d+)(?:m|min)?$/.exec(s))) {
    min = Number(m[1]);
  }
  return min !== null && min >= 1 && min <= 1440 ? min : null;
}

// Trazo de tinta proporcional a la duración (tope visual: 3h)
export function TrazoDuracion({ min }: { min: number }) {
  const ancho = Math.max(6, Math.round((Math.min(min, 180) / 180) * 44));
  return (
    <span
      aria-hidden
      className="inline-block h-[3px] rounded-full bg-ink/70"
      style={{ width: ancho }}
    />
  );
}

export default function DuracionPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (min: number | null) => void;
}) {
  const esPreset = value !== null && PRESETS.includes(value);
  const [texto, setTexto] = useState(
    value !== null && !esPreset ? fmtDuracion(value) : "",
  );
  const invalido = texto.trim() !== "" && parseDuracion(texto) === null;

  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 font-mono text-xs tracking-wider transition ${
      on
        ? "border-ink bg-ink text-paper"
        : "border-rule text-faint hover:border-ink hover:text-ink"
    }`;

  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] uppercase tracking-wider text-faint">
        dura
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setTexto("");
              onChange(value === p ? null : p);
            }}
            className={chip(value === p)}
            aria-pressed={value === p}
          >
            {fmtDuracion(p)}
          </button>
        ))}
        <input
          type="text"
          inputMode="text"
          value={texto}
          placeholder="otra: 45m, 1h20"
          aria-label="Duración escrita a mano"
          aria-invalid={invalido}
          onChange={(e) => {
            setTexto(e.target.value);
            const min = parseDuracion(e.target.value);
            if (min !== null) onChange(min);
            else if (!e.target.value.trim() && !esPreset) onChange(null);
          }}
          className={`w-32 rounded-full border bg-panel px-3 py-1 font-mono text-xs text-ink outline-none placeholder:text-faint/60 focus:border-ink ${
            invalido
              ? "border-alta"
              : value !== null && !esPreset
                ? "border-ink"
                : "border-rule"
          }`}
        />
        {value !== null && (
          <span className="flex items-center gap-1.5 pl-1 font-mono text-xs text-faint">
            <TrazoDuracion min={value} />
            {fmtDuracion(value)}
          </span>
        )}
      </div>
      {invalido && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-alta">
          probá con 45m, 1h30 o 1:30
        </p>
      )}
    </div>
  );
}
