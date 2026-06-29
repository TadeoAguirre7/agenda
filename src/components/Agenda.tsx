"use client";

import { useState } from "react";

export type Prioridad = "alta" | "media" | "baja";

export type Task = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  fechaVencimiento: string | null;
  recordatorioAt: string | null;
  completada: boolean;
};

const PRIORIDADES: Prioridad[] = ["alta", "media", "baja"];

const META: Record<Prioridad, { label: string; color: string }> = {
  alta: { label: "Alta", color: "var(--alta)" },
  media: { label: "Media", color: "var(--media)" },
  baja: { label: "Baja", color: "var(--baja)" },
};

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
    month: "short",
  }).format(d);
}

export default function Agenda({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [recordatorio, setRecordatorio] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [hechasOpen, setHechasOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  function tieneFecha(t: Task): boolean {
    return Boolean(t.fechaVencimiento || t.recordatorioAt);
  }

  const agendadas = tasks.filter((t) => !t.completada && tieneFecha(t));
  const porAgendar = tasks.filter((t) => !t.completada && !tieneFecha(t));
  const hechas = tasks.filter((t) => t.completada);

  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  async function crear() {
    const t = titulo.trim();
    if (!t) return;
    const tempId = "local-" + Date.now();
    const optimista: Task = {
      id: tempId,
      titulo: t,
      descripcion: null,
      prioridad,
      fechaVencimiento: null,
      recordatorioAt: recordatorio || null,
      completada: false,
    };
    setTasks((prev) => [optimista, ...prev]);
    setTitulo("");
    setRecordatorio("");
    setAbierto(false);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: t,
        prioridad,
        recordatorioAt: recordatorio || null,
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
            disabled={!titulo.trim()}
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

          <button
            onClick={() => setAbierto((v) => !v)}
            className="ml-auto font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
          >
            {abierto ? "− recordatorio" : "+ recordatorio"}
          </button>
        </div>

        {abierto && (
          <div className="mt-3">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-faint">
              avisame el
            </label>
            <input
              type="datetime-local"
              value={recordatorio}
              onChange={(e) => setRecordatorio(e.target.value)}
              className="mt-1 rounded-md border border-rule bg-panel px-3 py-1.5 font-mono text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        )}
      </section>

      {/* Grupos por prioridad */}
      {PRIORIDADES.map((p) => {
        const items = agendadas.filter((t) => t.prioridad === p);
        return (
          <section key={p} className="mb-9">
            <div className="mb-2 flex items-baseline gap-3">
              <h2
                className="font-mono text-xs uppercase tracking-[0.2em]"
                style={{ color: META[p].color }}
              >
                {META[p].label}
              </h2>
              <span className="font-mono text-xs text-faint">
                {items.length.toString().padStart(2, "0")}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="pl-4 font-sans text-sm text-faint/60">
                sin tareas
              </p>
            ) : (
              <ul
                className="space-y-px border-l-2 pl-4"
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

                    {editId === t.id ? (
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
                    ) : (
                      <span
                        className="flex-1 cursor-text text-ink"
                        onClick={() => {
                          setEditId(t.id);
                          setEditText(t.titulo);
                        }}
                      >
                        {t.titulo}
                      </span>
                    )}

                    {t.recordatorioAt && (
                      <span className="shrink-0 font-mono text-xs text-faint">
                        {fmtDiaCorto(t.recordatorioAt)
                          ? `${fmtDiaCorto(t.recordatorioAt)} `
                          : ""}
                        {fmtHora(t.recordatorioAt)}
                      </span>
                    )}

                    <button
                      aria-label="Borrar"
                      onClick={() => borrar(t.id)}
                      className="shrink-0 font-mono text-xs text-faint opacity-0 transition hover:text-alta group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
                className="group flex items-center gap-3 border-l-2 py-2 pl-4"
                style={{ borderColor: META[t.prioridad].color }}
              >
                <button
                  aria-label="Completar"
                  onClick={() => patch(t.id, { completada: true })}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition hover:border-ink"
                  style={{ borderColor: `${META[t.prioridad].color}90` }}
                />

                {editId === t.id ? (
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
                ) : (
                  <span
                    className="flex-1 cursor-text text-ink"
                    onClick={() => {
                      setEditId(t.id);
                      setEditText(t.titulo);
                    }}
                  >
                    {t.titulo}
                  </span>
                )}

                {scheduleId === t.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="rounded-md border border-rule bg-panel px-2 py-1 font-mono text-xs text-ink outline-none focus:border-ink"
                    />
                    <button
                      onClick={() => {
                        if (scheduleDate) {
                          patch(t.id, { recordatorioAt: scheduleDate });
                        }
                        setScheduleId(null);
                        setScheduleDate("");
                      }}
                      className="rounded-md bg-ink px-2 py-1 font-mono text-xs text-paper"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setScheduleId(null);
                        setScheduleDate("");
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
                      setScheduleDate("");
                    }}
                    className="shrink-0 font-mono text-xs text-faint opacity-0 transition hover:text-ink group-hover:opacity-100"
                  >
                    + fecha
                  </button>
                )}

                <button
                  aria-label="Borrar"
                  onClick={() => borrar(t.id)}
                  className="shrink-0 font-mono text-xs text-faint opacity-0 transition hover:text-alta group-hover:opacity-100"
                >
                  ✕
                </button>
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
                  <button
                    aria-label="Borrar"
                    onClick={() => borrar(t.id)}
                    className="shrink-0 font-mono text-xs text-faint opacity-0 transition hover:text-alta group-hover:opacity-100"
                  >
                    ✕
                  </button>
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
    prioridad: (["alta", "media", "baja"].includes(t.prioridad)
      ? t.prioridad
      : "media") as Prioridad,
  };
}
