"use client";

import { useState } from "react";
import ColorDot from "@/components/ColorDot";

export type Prioridad = "alta" | "media" | "baja";
export type Recurrencia = "ninguna" | "diaria" | "intervalo" | "semanal";

export type Task = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  fechaVencimiento: string | null;
  recordatorioAt: string | null;
  completada: boolean;
  hora: string | null;
  recurrencia: Recurrencia;
  intervaloDias: number | null;
  diasSemana: string | null;
  ultimaHechaDia: string | null;
};

const PRIORIDADES: Prioridad[] = ["alta", "media", "baja"];
const RECURRENCIAS: Recurrencia[] = ["ninguna", "diaria", "intervalo", "semanal"];

const DEFAULT_META: Record<Prioridad, { label: string; color: string }> = {
  alta: { label: "Alta", color: "#3e4e72" },
  media: { label: "Media", color: "#5b6f95" },
  baja: { label: "Baja", color: "#7a8baa" },
};

const DIAS_SEMANA = [
  { n: 1, label: "Lu" },
  { n: 2, label: "Ma" },
  { n: 3, label: "Mi" },
  { n: 4, label: "Ju" },
  { n: 5, label: "Vi" },
  { n: 6, label: "Sá" },
  { n: 0, label: "Do" },
];

const DIA_LABEL: Record<number, string> = {
  0: "do",
  1: "lu",
  2: "ma",
  3: "mi",
  4: "ju",
  5: "vi",
  6: "sá",
};

const pad = (n: number) => n.toString().padStart(2, "0");

function diaStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function diffDias(desde: string, hasta: string): number {
  const [ya, ma, da] = desde.split("-").map(Number);
  const [yb, mb, db] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000,
  );
}

function fmtHora(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtDiaCorto(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const hoy = new Date();
  const sameDay = d.toDateString() === hoy.toDateString();
  if (sameDay) return null;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

const FECHA_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const HORA_HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "DD/MM/AAAA" -> "YYYY-MM-DD" (null si es inválida)
function parseFecha(str: string): string | null {
  const m = FECHA_RE.exec(str.trim());
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== mm - 1 ||
    d.getDate() !== dd
  ) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// hora efectiva de la tarea: el campo hora o la del recordatorio
function horaDe(t: Task): string | null {
  if (t.hora) return t.hora;
  return fmtHora(t.recordatorioAt);
}

// primero las que no tienen hora (orden actual), luego las que tienen, ascendente
function ordenarPorHora(items: Task[]): Task[] {
  const sin = items.filter((t) => !horaDe(t));
  const con = items
    .filter((t) => horaDe(t))
    .sort((a, b) => horaDe(a)!.localeCompare(horaDe(b)!));
  return [...sin, ...con];
}

function tocaHoy(t: Task, hoy: string, hoyDow: number): boolean {
  switch (t.recurrencia) {
    case "diaria":
      return true;
    case "semanal":
      return (t.diasSemana ?? "").split(",").includes(String(hoyDow));
    case "intervalo":
      return (
        !t.ultimaHechaDia ||
        diffDias(t.ultimaHechaDia, hoy) >= (t.intervaloDias ?? 2)
      );
    default:
      return false;
  }
}

function hechaHoy(t: Task, hoy: string): boolean {
  return t.ultimaHechaDia === hoy;
}

function labelRecurrencia(t: Task): string {
  switch (t.recurrencia) {
    case "diaria":
      return "diaria";
    case "intervalo":
      return `cada ${t.intervaloDias}d`;
    case "semanal":
      return (t.diasSemana ?? "")
        .split(",")
        .filter(Boolean)
        .map((d) => DIA_LABEL[Number(d)])
        .join("·");
    default:
      return "";
  }
}

export default function Agenda({
  initial,
  preferences,
}: {
  initial: Task[];
  preferences?: Partial<Record<Prioridad, string>>;
}) {
  const [colores, setColores] = useState<Record<Prioridad, string>>({
    alta: preferences?.alta ?? DEFAULT_META.alta.color,
    media: preferences?.media ?? DEFAULT_META.media.color,
    baja: preferences?.baja ?? DEFAULT_META.baja.color,
  });
  const META: Record<Prioridad, { label: string; color: string }> = {
    alta: { label: "Alta", color: colores.alta },
    media: { label: "Media", color: colores.media },
    baja: { label: "Baja", color: colores.baja },
  };

  const [tasks, setTasks] = useState<Task[]>(initial);
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [recordatorioDia, setRecordatorioDia] = useState("");
  const [recordatorioHora, setRecordatorioHora] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [repetirOpen, setRepetirOpen] = useState(false);
  const [recurrencia, setRecurrencia] = useState<Recurrencia>("ninguna");
  const [intervaloDias, setIntervaloDias] = useState(2);
  const [diasSel, setDiasSel] = useState<number[]>([]);
  const [horaOpen, setHoraOpen] = useState(false);
  const [hora, setHora] = useState("");
  const [hechasOpen, setHechasOpen] = useState(false);
  const [noTocanOpen, setNoTocanOpen] = useState(false);
  const [seccionesOpen, setSeccionesOpen] = useState({
    recurrentes: true,
    alta: true,
    media: true,
    baja: true,
    porAgendar: true,
  });

  async function guardarColor(prioridad: Prioridad, color: string) {
    setColores((prev) => ({ ...prev, [prioridad]: color }));
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskColors: { [prioridad]: color } }),
    });
  }
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleDia, setScheduleDia] = useState("");
  const [scheduleHora, setScheduleHora] = useState("");

  const hoyDate = new Date();
  const hoy = diaStr(hoyDate);
  const hoyDow = hoyDate.getDay();

  const esRecurrenteActiva = recurrencia !== "ninguna";

  function esRecurrente(t: Task): boolean {
    return t.recurrencia !== "ninguna";
  }

  function tieneFecha(t: Task): boolean {
    return Boolean(t.fechaVencimiento || t.recordatorioAt);
  }

  const recurrentes = tasks.filter((t) => !t.completada && esRecurrente(t));
  const recHechasHoy = recurrentes.filter((t) => hechaHoy(t, hoy));
  const recPendientesHoy = ordenarPorHora(
    recurrentes.filter((t) => tocaHoy(t, hoy, hoyDow) && !hechaHoy(t, hoy)),
  );
  const recNoTocan = recurrentes.filter(
    (t) => !tocaHoy(t, hoy, hoyDow) && !hechaHoy(t, hoy),
  );

  const agendadas = tasks.filter(
    (t) => !t.completada && !esRecurrente(t) && tieneFecha(t),
  );
  const porAgendar = ordenarPorHora(
    tasks.filter((t) => !t.completada && !esRecurrente(t) && !tieneFecha(t)),
  );
  const hechas = tasks.filter((t) => t.completada);

  const fechaInvalida =
    recordatorioDia.trim() !== "" && !parseFecha(recordatorioDia);
  const anotarDisabled =
    !titulo.trim() ||
    (recurrencia === "semanal" && diasSel.length === 0) ||
    fechaInvalida;

  function recordatorioISO(): string | null {
    const iso = parseFecha(recordatorioDia);
    if (!iso) return null;
    const hm = HORA_HM_RE.test(recordatorioHora) ? recordatorioHora : "09:00";
    return `${iso}T${hm}`;
  }

  async function crear() {
    const t = titulo.trim();
    if (!t) return;
    if (recurrencia === "semanal" && diasSel.length === 0) return;

    const tempId = "local-" + Date.now();
    const optimista: Task = {
      id: tempId,
      titulo: t,
      descripcion: null,
      prioridad,
      fechaVencimiento: null,
      recordatorioAt: esRecurrenteActiva ? null : recordatorioISO(),
      completada: false,
      hora: hora || null,
      recurrencia,
      intervaloDias: recurrencia === "intervalo" ? intervaloDias : null,
      diasSemana:
        recurrencia === "semanal"
          ? diasSel
              .slice()
              .sort((a, b) => a - b)
              .join(",")
          : null,
      ultimaHechaDia: null,
    };
    setTasks((prev) => [optimista, ...prev]);
    setTitulo("");
    setRecordatorioDia("");
    setRecordatorioHora("");
    setAbierto(false);
    setRepetirOpen(false);
    setRecurrencia("ninguna");
    setIntervaloDias(2);
    setDiasSel([]);
    setHoraOpen(false);
    setHora("");

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: t,
        prioridad,
        recordatorioAt: optimista.recordatorioAt,
        hora: optimista.hora,
        recurrencia: optimista.recurrencia,
        intervaloDias: optimista.intervaloDias,
        diasSemana: optimista.diasSemana,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.offline) {
        setTasks((prev) =>
          prev.map((task) => (task.id === tempId ? normalize(data) : task)),
        );
      }
    }
  }

  async function patch(id: string, data: Partial<Task>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t)),
    );
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function borrar(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  function guardarEdicion() {
    if (!editId) return;
    const t = editText.trim();
    if (t) patch(editId, { titulo: t });
    setEditId(null);
    setEditText("");
  }

  function renderEditable(t: Task) {
    if (editId === t.id) {
      return (
        <input
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={guardarEdicion}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardarEdicion();
            if (e.key === "Escape") setEditId(null);
          }}
          className="w-full border-b border-ink bg-transparent text-ink outline-none"
        />
      );
    }
    return (
      <span
        className="flex-1 cursor-text text-ink"
        onClick={() => {
          setEditId(t.id);
          setEditText(t.titulo);
        }}
      >
        {t.titulo}
      </span>
    );
  }

  function renderBorrar(t: Task) {
    return (
      <button
        aria-label="Borrar"
        onClick={() => borrar(t.id)}
        className="shrink-0 font-mono text-sm text-faint/80 transition hover:text-alta"
      >
        ✕
      </button>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
      {/* Composer */}
      <section className="mb-12">
        <div className="flex items-center gap-3 border-b border-ink/80 pb-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crear()}
            placeholder="Escribí una tarea pendiente…"
            className="w-full bg-transparent text-lg text-ink outline-none placeholder:text-faint/70"
          />
          <button
            onClick={crear}
            disabled={anotarDisabled}
            className="shrink-0 rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper transition disabled:opacity-25"
          >
            Anotar
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRIORIDADES.map((p) => {
            const on = prioridad === p;
            return (
              <button
                key={p}
                onClick={() => setPrioridad(p)}
                className="group flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider transition"
                style={{
                  borderColor: on ? META[p].color : "var(--rule)",
                  color: on ? META[p].color : "var(--faint)",
                  background: on ? `${META[p].color}12` : "transparent",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: META[p].color }}
                />
                {META[p].label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-3">
            {!esRecurrenteActiva && (
              <button
                onClick={() => setAbierto((v) => !v)}
                className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
              >
                {abierto ? "− recordatorio" : "+ recordatorio"}
              </button>
            )}
            {!abierto && (
              <button
                onClick={() => setRepetirOpen((v) => !v)}
                className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
              >
                {repetirOpen ? "− repetir" : "+ repetir"}
              </button>
            )}
            <button
              onClick={() => setHoraOpen((v) => !v)}
              className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
            >
              {horaOpen ? "− hora" : "+ hora"}
            </button>
          </div>
        </div>

        {abierto && (
          <div className="mt-3">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-faint">
              avisame el
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                value={recordatorioDia}
                onChange={(e) => setRecordatorioDia(e.target.value)}
                className={`w-32 rounded-md border bg-panel px-3 py-1.5 font-mono text-sm text-ink outline-none placeholder:text-faint/60 focus:border-ink ${
                  fechaInvalida ? "border-alta" : "border-rule"
                }`}
              />
              <input
                type="time"
                value={recordatorioHora}
                onChange={(e) => setRecordatorioHora(e.target.value)}
                className="rounded-md border border-rule bg-panel px-3 py-1.5 font-mono text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            {fechaInvalida && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-alta">
                formato: DD/MM/AAAA
              </p>
            )}
          </div>
        )}

        {repetirOpen && (
          <div className="mt-3">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-faint">
              repetir
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {(
                [
                  { r: "diaria" as Recurrencia, label: "Todos los días" },
                  { r: "intervalo" as Recurrencia, label: "Cada X días" },
                  { r: "semanal" as Recurrencia, label: "Días de la semana" },
                ]
              ).map(({ r, label }) => {
                const on = recurrencia === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRecurrencia(on ? "ninguna" : r)}
                    className="rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider transition"
                    style={{
                      borderColor: on ? "var(--ink)" : "var(--rule)",
                      color: on ? "var(--paper)" : "var(--faint)",
                      background: on ? "var(--ink)" : "transparent",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {recurrencia === "intervalo" && (
              <div className="mt-2 flex items-center gap-2 font-mono text-xs text-faint">
                <span>cada</span>
                <input
                  type="number"
                  min={2}
                  max={365}
                  value={intervaloDias}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) {
                      setIntervaloDias(Math.min(365, Math.max(2, n)));
                    }
                  }}
                  className="w-16 rounded-md border border-rule bg-panel px-2 py-1 text-center text-ink outline-none focus:border-ink"
                />
                <span>días</span>
              </div>
            )}

            {recurrencia === "semanal" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map(({ n, label }) => {
                  const on = diasSel.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() =>
                        setDiasSel((prev) =>
                          on ? prev.filter((d) => d !== n) : [...prev, n],
                        )
                      }
                      className="rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition"
                      style={{
                        borderColor: on ? "var(--ink)" : "var(--rule)",
                        color: on ? "var(--paper)" : "var(--faint)",
                        background: on ? "var(--ink)" : "transparent",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {horaOpen && (
          <div className="mt-3">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-faint">
              a las
            </label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="mt-1 rounded-md border border-rule bg-panel px-3 py-1.5 font-mono text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        )}
      </section>

      {/* Recurrentes */}
      {recurrentes.length > 0 && (
        <section className="mb-9 border-b border-rule pb-8">
          <button
            onClick={() =>
              setSeccionesOpen((v) => ({ ...v, recurrentes: !v.recurrentes }))
            }
            className="mb-2 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em] text-ink transition hover:opacity-70"
          >
            <span>Recurrentes</span>
            <span>{recPendientesHoy.length.toString().padStart(2, "0")}</span>
            <span>{seccionesOpen.recurrentes ? "−" : "+"}</span>
          </button>
          <div className={seccionesOpen.recurrentes ? "block" : "hidden"}>

          {recPendientesHoy.length === 0 && recHechasHoy.length === 0 ? (
            <p className="pl-4 font-sans text-sm text-faint/60">
              nada para hoy
            </p>
          ) : (
            <ul className="space-y-px">
              {recPendientesHoy.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 border-l-3 py-2 pl-4"
                  style={{ borderColor: META[t.prioridad].color }}
                >
                  <button
                    aria-label="Hecha hoy"
                    onClick={() => patch(t.id, { ultimaHechaDia: hoy })}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition hover:border-ink"
                    style={{ borderColor: `${META[t.prioridad].color}90` }}
                  />
                  {renderEditable(t)}
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                    {labelRecurrencia(t)}
                  </span>
                  {horaDe(t) && (
                    <span className="shrink-0 font-mono text-xs text-faint">
                      {horaDe(t)}
                    </span>
                  )}
                  {renderBorrar(t)}
                </li>
              ))}
              {recHechasHoy.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 border-l-3 py-2 pl-4"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <button
                    aria-label="Reabrir"
                    onClick={() => patch(t.id, { ultimaHechaDia: null })}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] text-paper"
                  >
                    ✓
                  </button>
                  <span className="flex-1 text-faint line-through">
                    {t.titulo}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                    {labelRecurrencia(t)}
                  </span>
                  {horaDe(t) && (
                    <span className="shrink-0 font-mono text-xs text-faint">
                      {horaDe(t)}
                    </span>
                  )}
                  {renderBorrar(t)}
                </li>
              ))}
            </ul>
          )}

          {recNoTocan.length > 0 && (
            <div className="mt-3 pl-4">
              <button
                onClick={() => setNoTocanOpen((v) => !v)}
                className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint/70"
              >
                <span>No tocan hoy</span>
                <span>{recNoTocan.length.toString().padStart(2, "0")}</span>
                <span>{noTocanOpen ? "−" : "+"}</span>
              </button>

              {noTocanOpen && (
                <ul className="mt-2 space-y-px">
                  {recNoTocan.map((t) => (
                    <li
                      key={t.id}
                      className="group flex items-center gap-3 py-1.5 opacity-60"
                    >
                      <span className="h-5 w-5 shrink-0 rounded-full border border-faint/30" />
                      <span className="flex-1 text-faint">{t.titulo}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                        {labelRecurrencia(t)}
                      </span>
                      {horaDe(t) && (
                        <span className="shrink-0 font-mono text-xs text-faint">
                          {horaDe(t)}
                        </span>
                      )}
                      {renderBorrar(t)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          </div>
        </section>
      )}

      {/* Grupos por prioridad */}
      {PRIORIDADES.map((p) => {
        const items = ordenarPorHora(
          agendadas.filter((t) => t.prioridad === p),
        );
        return (
          <section key={p} className="mb-9">
            <button
              onClick={() =>
                setSeccionesOpen((v) => ({ ...v, [p]: !v[p] }))
              }
              className="mb-2 flex w-full items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em] transition hover:opacity-70"
              style={{ color: META[p].color }}
            >
              <span>{META[p].label}</span>
              <span>{items.length.toString().padStart(2, "0")}</span>
              <span>{seccionesOpen[p] ? "−" : "+"}</span>
              <span className="ml-auto">
                <ColorDot
                  color={META[p].color}
                  onChange={(c) => guardarColor(p, c)}
                  label={META[p].label}
                />
              </span>
            </button>
            <div className={seccionesOpen[p] ? "block" : "hidden"}>

            {items.length === 0 ? (
              <p className="pl-4 font-sans text-sm text-faint/60">
                sin tareas
              </p>
            ) : (
              <ul
                className="space-y-px border-l-3 pl-4"
                style={{ borderColor: META[p].color }}
              >
                {items.map((t) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 py-2"
                  >
                    <button
                      aria-label="Completar"
                      onClick={() => patch(t.id, { completada: true })}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-faint/50 transition hover:border-ink"
                      style={{ borderColor: `${META[p].color}90` }}
                    />

                    {renderEditable(t)}

                    {t.recordatorioAt && (
                      <span className="shrink-0 font-mono text-xs text-faint">
                        {fmtDiaCorto(t.recordatorioAt)
                          ? `${fmtDiaCorto(t.recordatorioAt)} `
                          : ""}
                        {fmtHora(t.recordatorioAt)}
                      </span>
                    )}

                    {t.hora && !t.recordatorioAt && (
                      <span className="shrink-0 font-mono text-xs text-faint">
                        {t.hora}
                      </span>
                    )}

                    {renderBorrar(t)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          </section>
        );
      })}

      {/* Pendientes por agendar */}
      {porAgendar.length > 0 && (
        <section className="mb-12 border-t border-rule pt-8">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
              Pendientes por agendar
            </h2>
            <span className="font-mono text-xs text-faint">
              {porAgendar.length.toString().padStart(2, "0")}
            </span>
          </div>

          <ul className="space-y-px">
            {porAgendar.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-3 border-l-3 py-2 pl-4"
                style={{ borderColor: META[t.prioridad].color }}
              >
                <button
                  aria-label="Completar"
                  onClick={() => patch(t.id, { completada: true })}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition hover:border-ink"
                  style={{ borderColor: `${META[t.prioridad].color}90` }}
                />

                {renderEditable(t)}

                {t.hora && (
                  <span className="shrink-0 font-mono text-xs text-faint">
                    {t.hora}
                  </span>
                )}

                {scheduleId === t.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      value={scheduleDia}
                      onChange={(e) => setScheduleDia(e.target.value)}
                      className="w-28 rounded-md border border-rule bg-panel px-2 py-1 font-mono text-xs text-ink outline-none placeholder:text-faint/60 focus:border-ink"
                    />
                    <input
                      type="time"
                      value={scheduleHora}
                      onChange={(e) => setScheduleHora(e.target.value)}
                      className="rounded-md border border-rule bg-panel px-2 py-1 font-mono text-xs text-ink outline-none focus:border-ink"
                    />
                    <button
                      onClick={() => {
                        const iso = parseFecha(scheduleDia);
                        if (iso) {
                          const hm = HORA_HM_RE.test(scheduleHora)
                            ? scheduleHora
                            : "09:00";
                          patch(t.id, { recordatorioAt: `${iso}T${hm}` });
                          setScheduleId(null);
                          setScheduleDia("");
                          setScheduleHora("");
                        }
                      }}
                      className="rounded-md bg-ink px-2 py-1 font-mono text-xs text-paper"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setScheduleId(null);
                        setScheduleDia("");
                        setScheduleHora("");
                      }}
                      className="font-mono text-xs text-faint"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setScheduleId(t.id);
                      setScheduleDia("");
                      setScheduleHora("");
                    }}
                    className="shrink-0 font-mono text-xs text-faint/80 transition hover:text-ink"
                  >
                    + fecha
                  </button>
                )}

                {renderBorrar(t)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hechas */}
      {hechas.length > 0 && (
        <section className="mt-12 border-t border-rule pt-6">
          <button
            onClick={() => setHechasOpen((v) => !v)}
            className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em] text-faint"
          >
            <span>Hechas</span>
            <span>{hechas.length.toString().padStart(2, "0")}</span>
            <span>{hechasOpen ? "−" : "+"}</span>
          </button>

          {hechasOpen && (
            <ul className="mt-3 space-y-px">
              {hechas.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 py-1.5">
                  <button
                    aria-label="Reabrir"
                    onClick={() => patch(t.id, { completada: false })}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] text-paper"
                  >
                    ✓
                  </button>
                  <span className="flex-1 text-faint line-through">
                    {t.titulo}
                  </span>
                  {renderBorrar(t)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function normalize(t: Task): Task {
  return {
    ...t,
    prioridad: (PRIORIDADES.includes(t.prioridad)
      ? t.prioridad
      : "media") as Prioridad,
    recurrencia: (RECURRENCIAS.includes(t.recurrencia)
      ? t.recurrencia
      : "ninguna") as Recurrencia,
  };
}
