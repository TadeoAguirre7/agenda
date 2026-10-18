"use client";

import { useEffect, useMemo, useState } from "react";
import {
  contarEjercicios,
  diaATexto,
  parseRutina,
  urlTecnica,
  type GymItem,
  type GymSeccion,
} from "@/lib/parse-rutina";

export type GymDia = {
  id: string;
  orden: number;
  titulo: string;
  subtitulo: string | null;
  secciones: GymSeccion[];
  completadoAt: string | null;
};
export type GymRutina = { notas: string[]; dias: GymDia[] } | null;

const CHECKS_KEY = "gym-checks";

// Nunca hechos primero (en su orden); después los hechos, del más viejo al
// más reciente: el último día entrenado queda al final.
function ordenar(dias: GymDia[]): GymDia[] {
  return [...dias].sort((a, b) => {
    if (!a.completadoAt && !b.completadoAt) return a.orden - b.orden;
    if (!a.completadoAt) return -1;
    if (!b.completadoAt) return 1;
    return a.completadoAt.localeCompare(b.completadoAt);
  });
}

function hace(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const dias = Math.round(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  if (dias <= 0) return "hecho hoy";
  if (dias === 1) return "hecho ayer";
  return `hecho hace ${dias} días`;
}

// "4x10-12" -> "4×10-12"
const dosisFmt = (s: string) => s.replace(/(\d)\s*x\s*/gi, "$1×");

// **negrita** en las notas, sin HTML crudo
function conNegritas(texto: string) {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-ink">
        {parte}
      </strong>
    ) : (
      parte
    ),
  );
}

const claveItem = (s: number, i: number) => `${s}:${i}`;

function leerChecks(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(CHECKS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function Gimnasio({ initial }: { initial: GymRutina }) {
  const [rutina, setRutina] = useState<GymRutina>(initial);
  const [checks, setChecks] = useState<Record<string, string[]>>(() =>
    typeof window === "undefined" ? {} : leerChecks(),
  );
  // ids cuyo estado abierto/cerrado difiere del default (el próximo arranca abierto)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [importando, setImportando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(
    null,
  );
  const [borrando, setBorrando] = useState(false);
  const [notasOpen, setNotasOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    } catch {
      // ignore
    }
  }, [checks]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const dias = useMemo(() => ordenar(rutina?.dias ?? []), [rutina]);

  function toggleCheck(diaId: string, clave: string) {
    setChecks((prev) => {
      const actual = prev[diaId] ?? [];
      const next = actual.includes(clave)
        ? actual.filter((k) => k !== clave)
        : [...actual, clave];
      return { ...prev, [diaId]: next };
    });
  }

  function setCompletado(id: string, completadoAt: string | null) {
    setRutina((r) =>
      r ? { ...r, dias: r.dias.map((d) => (d.id === id ? { ...d, completadoAt } : d)) } : r,
    );
  }

  async function terminar(dia: GymDia) {
    const previo = dia.completadoAt;
    const prevChecks = checks[dia.id] ?? [];
    setCompletado(dia.id, new Date().toISOString());
    setChecks((p) => ({ ...p, [dia.id]: [] }));
    setAbiertos(new Set());

    const res = await fetch(`/api/gym/days/${dia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: true }),
    }).catch(() => null);

    if (!res?.ok) {
      setCompletado(dia.id, previo);
      setChecks((p) => ({ ...p, [dia.id]: prevChecks }));
      setAviso({ texto: "No se pudo guardar. Revisá tu conexión e intentá de nuevo." });
      return;
    }

    setAviso({
      texto: `${dia.titulo} pasó al final de la lista`,
      deshacer: async () => {
        setCompletado(dia.id, previo);
        setChecks((p) => ({ ...p, [dia.id]: prevChecks }));
        setAviso(null);
        await fetch(`/api/gym/days/${dia.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completadoAt: previo }),
        }).catch(() => null);
      },
    });
  }

  function toggle(id: string) {
    setAbiertos((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function diaGuardado(d: GymDia) {
    setRutina((r) =>
      r ? { ...r, dias: r.dias.map((x) => (x.id === d.id ? d : x)) } : r,
    );
    // los checks van por posición: si cambió el contenido, se resetean
    setChecks((p) => ({ ...p, [d.id]: [] }));
    setEditandoId(null);
    setAviso({ texto: `${d.titulo} actualizado` });
  }

  async function borrarRutina() {
    setBorrando(false);
    const antes = rutina;
    setRutina(null);
    const res = await fetch("/api/gym", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setRutina(antes);
      setAviso({ texto: "No se pudo borrar la rutina. Intentá de nuevo." });
    }
  }

  function botonEditar(onClick: () => void, etiqueta: string) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={etiqueta}
        title={etiqueta}
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-faint transition hover:bg-ink/5 hover:text-ink"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M10.5 2.5l3 3L5 14H2v-3z" strokeLinejoin="round" />
        </svg>
        Editar
      </button>
    );
  }

  function renderItem(dia: GymDia, it: GymItem, s: number, i: number, calentamiento: boolean) {
    const clave = claveItem(s, i);
    const hecho = (checks[dia.id] ?? []).includes(clave);
    return (
      <li key={clave} className="flex items-center gap-3 py-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={hecho}
          aria-label={`Marcar ${it.nombre}`}
          onClick={() => toggleCheck(dia.id, clave)}
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] transition ${
            hecho ? "border-ink bg-ink text-paper" : "border-faint/60 hover:border-ink"
          }`}
        >
          {hecho && "✓"}
        </button>
        <span
          className={`min-w-0 flex-1 ${calentamiento ? "text-sm" : ""} ${
            hecho ? "text-faint line-through" : "text-ink"
          }`}
        >
          {it.nombre}
        </span>
        {it.dosis && (
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums ${
              calentamiento ? "border-transparent text-faint" : "border-ink/20 text-ink"
            }`}
          >
            {dosisFmt(it.dosis)}
          </span>
        )}
        {it.url && /^https?:\/\//i.test(it.url) && (
          <a
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver cómo se hace"
            aria-label={`Ver video de ${it.nombre}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint transition hover:bg-ink/5 hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M4.5 2.8v10.4L13 8z" />
            </svg>
          </a>
        )}
      </li>
    );
  }

  function renderContenido(dia: GymDia) {
    const marcados = (checks[dia.id] ?? []).length;
    const total = dia.secciones.reduce((n, s) => n + s.items.length, 0);
    return (
      <div className="space-y-5">
        {dia.secciones.map((sec, s) => {
          const calentamiento = sec.tipo === "calentamiento";
          return (
            <section key={s}>
              <h4 className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                {sec.titulo}
              </h4>
              <ul className={calentamiento ? "" : "divide-y divide-rule"}>
                {sec.items.map((it, i) => renderItem(dia, it, s, i, calentamiento))}
              </ul>
            </section>
          );
        })}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => terminar(dia)}
            className="rounded-full bg-ink px-5 py-2 font-mono text-xs uppercase tracking-wider text-paper transition hover:opacity-90"
          >
            Terminé el día
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint tabular-nums">
            {marcados}/{total} marcados
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
      <div className="mb-8 flex items-baseline justify-between gap-3">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
          Rutina{dias.length > 0 && ` · ${dias.length} días`}
        </h1>
        {rutina && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setImportando(true)}
              className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:text-ink hover:underline"
            >
              Importar otra
            </button>
            <button
              type="button"
              onClick={() => setBorrando(true)}
              className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:text-peligro hover:underline"
            >
              Borrar
            </button>
          </div>
        )}
      </div>

      {!rutina || dias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rule bg-panel/60 px-6 py-12 text-center">
          <p className="font-display text-4xl text-ink">Sin rutina todavía</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-faint">
            Pegá tu rutina y la divido en días. Cada día arranca con{" "}
            <code className="font-mono text-ink">## DÍA 1: …</code>
          </p>
          <button
            type="button"
            onClick={() => setImportando(true)}
            className="mt-6 rounded-full bg-ink px-5 py-2 font-mono text-xs uppercase tracking-wider text-paper"
          >
            Importar rutina
          </button>
        </div>
      ) : (
        <ol className="space-y-3">
          {dias.map((dia, idx) => {
            const proximo = idx === 0;
            const abierto = proximo !== abiertos.has(dia.id);
            const editando = editandoId === dia.id;
            const n = contarEjercicios(dia);
            return (
              <li
                key={dia.id}
                className={`rounded-xl border bg-panel transition motion-safe:animate-[fadeIn_.25s_ease-out] ${
                  proximo ? "border-ink/80 shadow-sm" : "border-rule"
                }`}
              >
                <div className={`flex items-start gap-2 ${proximo ? "p-5 sm:p-6" : "px-5 py-4"}`}>
                  <button
                    type="button"
                    aria-expanded={abierto}
                    onClick={() => toggle(dia.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    {proximo ? (
                      <>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
                          Te toca
                        </span>
                        <span className="mt-1 block font-display text-5xl leading-none text-ink">
                          {dia.titulo}
                        </span>
                        {dia.subtitulo && (
                          <span className="mt-2 block font-mono text-xs uppercase tracking-[0.15em] text-ink">
                            {dia.subtitulo}
                          </span>
                        )}
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
                          {n} ejercicios
                          {dia.completadoAt && ` · ${hace(dia.completadoAt)}`}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-4">
                        <span className="w-20 shrink-0 font-display text-3xl leading-none text-ink">
                          {dia.titulo}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs uppercase tracking-[0.12em] text-ink">
                            {dia.subtitulo ?? `${n} ejercicios`}
                          </span>
                          <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">
                            {dia.completadoAt ? hace(dia.completadoAt) : "sin hacer"} · {n} ejercicios
                          </span>
                        </span>
                      </span>
                    )}
                  </button>
                  {!editando && botonEditar(() => {
                    setEditandoId(dia.id);
                    if (!abierto) toggle(dia.id);
                  }, `Editar ${dia.titulo}`)}
                  <button
                    type="button"
                    onClick={() => toggle(dia.id)}
                    aria-label={abierto ? `Cerrar ${dia.titulo}` : `Abrir ${dia.titulo}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm text-faint transition hover:bg-ink/5 hover:text-ink"
                  >
                    {abierto ? "−" : "+"}
                  </button>
                </div>
                {abierto && (
                  <div className={`border-t border-rule px-5 pb-5 pt-4 ${proximo ? "sm:px-6" : ""}`}>
                    {editando ? (
                      <EditorDia
                        dia={dia}
                        onCancelar={() => setEditandoId(null)}
                        onGuardado={diaGuardado}
                      />
                    ) : (
                      renderContenido(dia)
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {rutina && dias.length > 0 && (
        <section className="mt-10 border-t border-rule pt-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-expanded={notasOpen}
              onClick={() => setNotasOpen((v) => !v)}
              className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em] text-faint"
            >
              Notas de la rutina <span>{notasOpen ? "−" : "+"}</span>
            </button>
            {!editandoNotas &&
              botonEditar(() => {
                setEditandoNotas(true);
                setNotasOpen(true);
              }, "Editar notas")}
          </div>
          {editandoNotas ? (
            <EditorNotas
              notas={rutina.notas}
              onCancelar={() => setEditandoNotas(false)}
              onGuardado={(notas) => {
                setRutina((r) => (r ? { ...r, notas } : r));
                setEditandoNotas(false);
                setAviso({ texto: "Notas actualizadas" });
              }}
            />
          ) : notasOpen && (
            <ul className="mt-4 space-y-3">
              {rutina.notas.map((n, i) => (
                <li key={i} className="border-l-2 border-rule pl-3 text-sm leading-relaxed text-faint">
                  {conNegritas(n)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {importando && (
        <ModalImportar
          reemplaza={!!rutina}
          onCerrar={() => setImportando(false)}
          onImportada={(r) => {
            setRutina(r);
            setChecks({});
            setAbiertos(new Set());
            setImportando(false);
            setAviso({ texto: `Rutina importada: ${r?.dias.length ?? 0} días` });
          }}
        />
      )}

      {borrando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onClick={() => setBorrando(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border border-rule bg-paper p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-peligro">
              Borrar rutina
            </h3>
            <p className="mt-3 text-sm text-ink">
              Se borran todos los días y su historial. No se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                autoFocus
                onClick={() => setBorrando(false)}
                className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
              >
                Cancelar
              </button>
              <button
                onClick={borrarRutina}
                className="rounded-full bg-peligro px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-4 rounded-full bg-ink px-5 py-2.5 text-sm text-paper shadow-lg"
        >
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button
              type="button"
              onClick={aviso.deshacer}
              className="font-mono text-xs uppercase tracking-wider underline underline-offset-4"
            >
              Deshacer
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function ModalImportar({
  reemplaza,
  onCerrar,
  onImportada,
}: {
  reemplaza: boolean;
  onCerrar: () => void;
  onImportada: (r: GymRutina) => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previa = useMemo(() => parseRutina(texto), [texto]);
  const ejercicios = previa.dias.reduce((n, d) => n + contarEjercicios(d), 0);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  async function importar() {
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/gym", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    setEnviando(false);
    if (!res?.ok || !data) {
      setError(data?.error ?? "No se pudo importar. Revisá tu conexión.");
      return;
    }
    onImportada({
      notas: (data.notas as string[]) ?? [],
      dias: (data.dias as GymDia[]).map((d) => ({
        ...d,
        completadoAt: d.completadoAt ?? null,
      })),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-5"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-titulo"
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl border border-rule bg-paper p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h3 id="importar-titulo" className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
            Importar rutina
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="font-mono text-xs text-faint hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-faint">
          Pegá la rutina completa. Cada día empieza con{" "}
          <code className="font-mono text-ink">## DÍA 1: PIERNA</code>, las secciones van en{" "}
          <code className="font-mono text-ink">**negrita**</code> y los links de video debajo de cada
          ejercicio.
        </p>
        <textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"## DÍA 1: PIERNA + GLÚTEOS\n\n**Ejercicios**\n1. Hip thrust: 4x10-12\nhttps://www.youtube.com/…"}
          className="mt-4 min-h-48 flex-1 resize-none rounded-lg border border-rule bg-panel p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-faint/60 focus:border-ink"
        />

        <div className="mt-3 min-h-10" aria-live="polite">
          {texto.trim() &&
            (previa.dias.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="mr-1 self-center font-mono text-[10px] uppercase tracking-wider text-faint">
                  {previa.dias.length} días · {ejercicios} ejercicios
                  {previa.notas.length > 0 && ` · ${previa.notas.length} notas`}
                </span>
                {previa.dias.map((d, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-rule px-2.5 py-0.5 font-mono text-[10px] text-ink"
                  >
                    {d.titulo}
                    {d.subtitulo && ` · ${d.subtitulo}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-wider text-peligro">
                No encuentro días. Cada día tiene que empezar con ## (ej. ## DÍA 1: PIERNA)
              </p>
            ))}
          {error && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-peligro">{error}</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-3">
          {reemplaza && (
            <span className="mr-auto font-mono text-[10px] uppercase tracking-wider text-faint">
              Reemplaza la rutina actual
            </span>
          )}
          <button
            onClick={onCerrar}
            className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
          >
            Cancelar
          </button>
          <button
            onClick={importar}
            disabled={previa.dias.length === 0 || enviando}
            className="rounded-full bg-ink px-5 py-2 font-mono text-xs uppercase tracking-wider text-paper transition disabled:opacity-25"
          >
            {enviando ? "Importando…" : "Importar rutina"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ItemEdit = GymItem & { key: number; nombreOriginal: string };
type SeccionEdit = Omit<GymSeccion, "items"> & { key: number; items: ItemEdit[] };

let sigKey = 0;
const nuevaKey = () => ++sigKey;

const campo =
  "min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 outline-none transition hover:border-rule focus:border-ink focus:bg-paper";

function EditorDia({
  dia,
  onCancelar,
  onGuardado,
}: {
  dia: GymDia;
  onCancelar: () => void;
  onGuardado: (d: GymDia) => void;
}) {
  const [titulo, setTitulo] = useState(dia.titulo);
  const [subtitulo, setSubtitulo] = useState(dia.subtitulo ?? "");
  const [secciones, setSecciones] = useState<SeccionEdit[]>(() =>
    dia.secciones.map((s) => ({
      ...s,
      key: nuevaKey(),
      items: s.items.map((it) => ({ ...it, key: nuevaKey(), nombreOriginal: it.nombre })),
    })),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vacio =
    !titulo.trim() || !secciones.some((s) => s.items.some((it) => it.nombre.trim()));

  function editarSeccion(k: number, cambio: (s: SeccionEdit) => SeccionEdit) {
    setSecciones((prev) => prev.map((s) => (s.key === k ? cambio(s) : s)));
  }

  function editarItem(sk: number, ik: number, cambio: Partial<GymItem>) {
    editarSeccion(sk, (s) => ({
      ...s,
      items: s.items.map((it) => (it.key === ik ? { ...it, ...cambio } : it)),
    }));
  }

  async function guardar() {
    // nombre cambiado (o ejercicio nuevo) -> link nuevo "<nombre> tecnica"
    const final: GymSeccion[] = secciones
      .map((s) => ({
        titulo: s.titulo.trim() || "Ejercicios",
        tipo: s.tipo,
        items: s.items
          .filter((it) => it.nombre.trim())
          .map((it) => {
            const nombre = it.nombre.trim().replace(/: /g, " - ");
            const cambio = nombre !== it.nombreOriginal || !it.url;
            return {
              nombre,
              dosis: it.dosis?.trim() || null,
              url: cambio ? urlTecnica(nombre) : it.url,
            };
          }),
      }))
      .filter((s) => s.items.length > 0);

    const texto = diaATexto({
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim() || null,
      secciones: final,
    });

    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/gym/days/${dia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    setEnviando(false);
    if (!res?.ok || !data) {
      setError(data?.error ?? "No se pudo guardar. Revisá tu conexión.");
      return;
    }
    onGuardado({ ...dia, titulo: data.titulo, subtitulo: data.subtitulo, secciones: data.secciones });
  }

  return (
    <div
      className="space-y-5"
      onKeyDown={(e) => e.key === "Escape" && onCancelar()}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nombre del día"
          placeholder="Día 1"
          maxLength={60}
          className={`${campo} w-36 font-display text-3xl text-ink`}
        />
        <input
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
          aria-label="Grupo muscular"
          placeholder="Pierna + glúteos"
          maxLength={120}
          className={`${campo} flex-1 font-mono text-xs uppercase tracking-[0.12em] text-ink`}
        />
      </div>

      {secciones.map((sec) => {
        const calentamiento = sec.tipo === "calentamiento";
        return (
          <section key={sec.key}>
            <div className="mb-1 flex items-center gap-2">
              <input
                value={sec.titulo}
                onChange={(e) => editarSeccion(sec.key, (s) => ({ ...s, titulo: e.target.value }))}
                aria-label="Nombre de la sección"
                maxLength={120}
                className={`${campo} flex-1 font-mono text-[10px] uppercase tracking-[0.2em] text-faint`}
              />
              <button
                type="button"
                onClick={() => setSecciones((p) => p.filter((s) => s.key !== sec.key))}
                className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-peligro"
              >
                Quitar sección
              </button>
            </div>
            <ul className={calentamiento ? "" : "divide-y divide-rule"}>
              {sec.items.map((it) => {
                const cambiado = it.nombre.trim() !== it.nombreOriginal;
                return (
                  <li key={it.key} className="flex items-center gap-2 py-1.5">
                    <input
                      value={it.nombre}
                      onChange={(e) => editarItem(sec.key, it.key, { nombre: e.target.value })}
                      aria-label="Ejercicio"
                      placeholder="Ejercicio"
                      maxLength={200}
                      className={`${campo} flex-1 ${calentamiento ? "text-sm" : ""} text-ink`}
                    />
                    <input
                      value={it.dosis ?? ""}
                      onChange={(e) => editarItem(sec.key, it.key, { dosis: e.target.value })}
                      aria-label="Series y repeticiones"
                      placeholder="3x12"
                      maxLength={60}
                      className={`${campo} w-28 shrink-0 border-ink/20 text-center font-mono text-xs tabular-nums text-ink`}
                    />
                    <span
                      className="w-7 shrink-0 text-center text-faint"
                      title={
                        cambiado || !it.url
                          ? "Al guardar se busca en YouTube: nombre + técnica"
                          : "Video actual"
                      }
                    >
                      {cambiado || !it.url ? (
                        <span className="font-mono text-[9px] uppercase">nuevo</span>
                      ) : (
                        <svg viewBox="0 0 16 16" className="mx-auto h-3.5 w-3.5" fill="currentColor" aria-hidden>
                          <path d="M4.5 2.8v10.4L13 8z" />
                        </svg>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${it.nombre || "ejercicio"}`}
                      onClick={() =>
                        editarSeccion(sec.key, (s) => ({
                          ...s,
                          items: s.items.filter((x) => x.key !== it.key),
                        }))
                      }
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint transition hover:bg-peligro/10 hover:text-peligro"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() =>
                editarSeccion(sec.key, (s) => ({
                  ...s,
                  items: [
                    ...s.items,
                    { key: nuevaKey(), nombre: "", dosis: "", url: null, nombreOriginal: "" },
                  ],
                }))
              }
              className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint hover:text-ink"
            >
              + ejercicio
            </button>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() =>
          setSecciones((p) => [
            ...p,
            {
              key: nuevaKey(),
              titulo: "Ejercicios",
              tipo: "ejercicios",
              items: [{ key: nuevaKey(), nombre: "", dosis: "", url: null, nombreOriginal: "" }],
            },
          ])
        }
        className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-ink"
      >
        + sección
      </button>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <span className="mr-auto font-mono text-[10px] uppercase tracking-wider text-peligro" aria-live="polite">
          {error ?? (vacio ? "Poné un nombre y al menos un ejercicio" : "")}
        </span>
        <button
          type="button"
          onClick={onCancelar}
          className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={vacio || enviando}
          className="rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper disabled:opacity-25"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function EditorNotas({
  notas,
  onCancelar,
  onGuardado,
}: {
  notas: string[];
  onCancelar: () => void;
  onGuardado: (notas: string[]) => void;
}) {
  const [lista, setLista] = useState(() =>
    (notas.length ? notas : [""]).map((texto) => ({ key: nuevaKey(), texto })),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/gym", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notas: lista.map((n) => n.texto.replace(/\s+/g, " ").trim()).join("\n"),
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    setEnviando(false);
    if (!res?.ok || !data) {
      setError(data?.error ?? "No se pudo guardar. Revisá tu conexión.");
      return;
    }
    onGuardado(data.notas);
  }

  return (
    <div className="mt-4" onKeyDown={(e) => e.key === "Escape" && onCancelar()}>
      <ul className="space-y-2">
        {lista.map((n, i) => (
          <li key={n.key} className="flex items-start gap-2 border-l-2 border-rule pl-2">
            <textarea
              autoFocus={i === 0}
              value={n.texto}
              onChange={(e) =>
                setLista((p) => p.map((x) => (x.key === n.key ? { ...x, texto: e.target.value } : x)))
              }
              rows={Math.max(1, Math.ceil(n.texto.length / 70))}
              maxLength={500}
              aria-label={`Nota ${i + 1}`}
              placeholder="Nueva nota"
              className={`${campo} flex-1 resize-none text-sm leading-relaxed text-faint focus:text-ink`}
            />
            <button
              type="button"
              aria-label="Quitar nota"
              onClick={() => setLista((p) => p.filter((x) => x.key !== n.key))}
              className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint transition hover:bg-peligro/10 hover:text-peligro"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setLista((p) => [...p, { key: nuevaKey(), texto: "" }])}
        className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint hover:text-ink"
      >
        + nota
      </button>
      <p className="mt-2 text-xs text-faint/80">
        <code className="font-mono">**texto**</code> se ve en negrita.
      </p>
      <div className="mt-3 flex items-center gap-3">
        {error && (
          <span className="mr-auto font-mono text-[10px] uppercase tracking-wider text-peligro">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={onCancelar}
          className="ml-auto font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={enviando}
          className="rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper disabled:opacity-25"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
