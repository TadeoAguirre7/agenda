"use client";

import { useCallback, useRef, useState } from "react";

const CX = 100;
const CY = 100;
const R_FACE = 90;
const R_INNER = 55;
const R_OUTER = 80;
const R_MIN = 80;

function parseTime(value: string): { h: number; m: number } {
  const [h, m] = value.split(":").map(Number);
  return {
    h: Number.isNaN(h) ? 0 : Math.max(0, Math.min(23, h)),
    m: Number.isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

function fmtHM(h: number, m: number): string {
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function polar(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { r: number; angle: number; scale: number } {
  const scale = rect.width / 200;
  const x = (clientX - rect.left - rect.width / 2) / scale;
  const y = (clientY - rect.top - rect.height / 2) / scale;
  const r = Math.sqrt(x * x + y * y);
  let angle = Math.atan2(x, -y) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return { r, angle, scale };
}

export default function AnalogTimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { h: currentH, m: currentM } = parseTime(value);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [selH, setSelH] = useState(currentH);
  const [selM, setSelM] = useState(currentM);
  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const { r, angle } = polar(e.clientX, e.clientY, rect);

      if (mode === "hour") {
        const threshold = (R_INNER + R_OUTER) / 2;
        const isOuter = r >= threshold;
        const base = isOuter ? 12 : 0;
        const h = (base + Math.round(angle / 30)) % 12;
        const h24 = h === 0 && !isOuter ? 0 : base + h;
        setSelH(h24);
        onChange(fmtHM(h24, selM));
        setMode("minute");
      } else {
        const m = Math.round(angle / 6) % 60;
        setSelM(m);
        onChange(fmtHM(selH, m));
      }
    },
    [mode, selH, selM, onChange],
  );

  function hourPos(h: number) {
    const isOuter = h >= 12;
    const radius = isOuter ? R_OUTER : R_INNER;
    const angle = ((h % 12) * 30 * Math.PI) / 180;
    return {
      x: CX + radius * Math.sin(angle),
      y: CY - radius * Math.cos(angle),
    };
  }

  function minutePos(m: number) {
    const angle = (m * 6 * Math.PI) / 180;
    return {
      x: CX + R_MIN * Math.sin(angle),
      y: CY - R_MIN * Math.cos(angle),
    };
  }

  return (
    <div className="w-52">
      {label && (
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
          {label}
        </label>
      )}
      <div className="mb-2 text-center font-mono text-lg text-ink">
        {fmtHM(selH, selM)}
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        className="h-52 w-52 touch-none cursor-pointer"
        onPointerDown={handlePointer}
      >
        {/* cara */}
        <circle
          cx={CX}
          cy={CY}
          r={R_FACE}
          fill="var(--panel)"
          stroke="var(--rule)"
          strokeWidth={2}
        />
        <circle cx={CX} cy={CY} r={3} fill="var(--ink)" />

        {mode === "hour" ? (
          <>
            {/* anillos horarios */}
            {Array.from({ length: 24 }, (_, h) => {
              const pos = hourPos(h);
              const selected = selH === h;
              return (
                <g key={h}>
                  {selected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={14}
                      fill="var(--ink)"
                    />
                  )}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={selected ? "var(--paper)" : "var(--ink)"}
                    className="select-none font-mono text-xs"
                    fontWeight={selected ? 700 : 400}
                  >
                    {h}
                  </text>
                </g>
              );
            })}
            {/* manecilla horaria */}
            <line
              x1={CX}
              y1={CY}
              x2={hourPos(selH).x}
              y2={hourPos(selH).y}
              stroke="var(--ink)"
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            {/* numeros minutos cada 5 */}
            {Array.from({ length: 12 }, (_, i) => {
              const m = i * 5;
              const pos = minutePos(m);
              const selected = selM === m;
              return (
                <g key={m}>
                  {selected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={12}
                      fill="var(--ink)"
                    />
                  )}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={selected ? "var(--paper)" : "var(--ink)"}
                    className="select-none font-mono text-xs"
                    fontWeight={selected ? 700 : 400}
                  >
                    {m.toString().padStart(2, "0")}
                  </text>
                </g>
              );
            })}
            {/* punto para minutos intermedios */}
            {selM % 5 !== 0 && (
              <circle
                cx={minutePos(selM).x}
                cy={minutePos(selM).y}
                r={6}
                fill="var(--ink)"
              />
            )}
            {/* manecilla minutera */}
            <line
              x1={CX}
              y1={CY}
              x2={minutePos(selM).x}
              y2={minutePos(selM).y}
              stroke="var(--ink)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setMode("hour")}
          className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider transition ${
            mode === "hour"
              ? "bg-ink text-paper"
              : "border border-rule text-faint hover:border-ink"
          }`}
        >
          Hora
        </button>
        <button
          type="button"
          onClick={() => setMode("minute")}
          className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider transition ${
            mode === "minute"
              ? "bg-ink text-paper"
              : "border border-rule text-faint hover:border-ink"
          }`}
        >
          Minuto
        </button>
      </div>
    </div>
  );
}
