"use client";

import { useState } from "react";
import { parseLista, csvALineas } from "@/lib/parse-list";

export type Categoria = "restaurantes" | "cafes" | "bares" | "dulces";

export type RestaurantItem = {
  id: string;
  titulo: string;
  categoria: Categoria;
  completada: boolean;
};

const CATEGORIAS: Categoria[] = ["restaurantes", "cafes", "bares", "dulces"];

const META: Record<Categoria, { label: string; color: string }> = {
  restaurantes: { label: "Restaurantes", color: "#c2410c" },
  cafes: { label: "Cafés", color: "#92400e" },
  bares: { label: "Bares", color: "#7c3aed" },
  dulces: { label: "Dulces", color: "#db2777" },
};

export default function Restaurantes({
  initial,
}: {
  initial: RestaurantItem[];
}) {
  const [items, setItems] = useState<RestaurantItem[]>(initial);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("restaurantes");
  const [visitadosOpen, setVisitadosOpen] = useState<Record<Categoria, boolean>>({
    restaurantes: false,
    cafes: false,
    bares: false,
    dulces: false,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importTexto, setImportTexto] = useState("");
  const [importCategoria, setImportCategoria] = useState<Categoria>("restaurantes");

  const pendientes = items.filter((i) => !i.completada);
  const visitados = items.filter((i) => i.completada);

  async function crear() {
    const t = titulo.trim();
    if (!t) return;
    const tempId = "local-" + Date.now();
    const optimista: RestaurantItem = {
      id: tempId,
      titulo: t,
      categoria,
      completada: false,
    };
    setItems((prev) => [optimista, ...prev]);
    setTitulo("");

    const res = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: t, categoria }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.offline) {
        setItems((prev) =>
          prev.map((item) => (item.id === tempId ? data : item)),
        );
      }
    }
  }

  async function patch(id: string, data: Partial<RestaurantItem>) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...data } : i)),
    );
    await fetch(`/api/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function borrar(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
  }

  async function importar() {
    const titulos = parseLista(importTexto);
    if (titulos.length === 0) return;
    const tempItems: RestaurantItem[] = titulos.map((t, i) => ({
      id: `local-${Date.now()}-${i}`,
      titulo: t,
      categoria: importCategoria,
      completada: false,
    }));
    setItems((prev) => [...tempItems, ...prev]);
    setImportTexto("");
    setImportOpen(false);

    const res = await fetch("/api/restaurants/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria: importCategoria, titulos }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.offline && Array.isArray(data)) {
        const tempIds = new Set(tempItems.map((t) => t.id));
        setItems((prev) => [
          ...data,
          ...prev.filter((i) => !tempIds.has(i.id)),
        ]);
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-10 pb-24 pt-10 sm:pt-16">
      <section className="mb-12">
        <div className="flex items-center gap-3 border-b border-ink/80 pb-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crear()}
            placeholder="Agregar lugar…"
            className="w-full bg-transparent text-lg text-ink outline-none placeholder:text-faint/70"
          />
          <button
            onClick={crear}
            disabled={!titulo.trim()}
            className="shrink-0 rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper transition disabled:opacity-25"
          >
            Agregar
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {CATEGORIAS.map((c) => {
            const on = categoria === c;
            return (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className="group flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider transition"
                style={{
                  borderColor: on ? META[c].color : "var(--rule)",
                  color: on ? META[c].color : "var(--faint)",
                  background: on ? `${META[c].color}12` : "transparent",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: META[c].color }}
                />
                {META[c].label}
              </button>
            );
          })}

          <button
            onClick={() => {
              setImportCategoria(categoria);
              setImportOpen((v) => !v);
            }}
            className="ml-auto font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
          >
            {importOpen ? "− importar" : "+ importar"}
          </button>
        </div>

        {importOpen && (
          <div className="mt-3 rounded-md border border-rule bg-panel p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                importar a
              </span>
              {CATEGORIAS.map((c) => {
                const on = importCategoria === c;
                return (
                  <button
                    key={c}
                    onClick={() => setImportCategoria(c)}
                    className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition"
                    style={{
                      borderColor: on ? META[c].color : "var(--rule)",
                      color: on ? META[c].color : "var(--faint)",
                      background: on ? `${META[c].color}12` : "transparent",
                    }}
                  >
                    {META[c].label}
                  </button>
                );
              })}
            </div>

            <textarea
              rows={6}
              value={importTexto}
              onChange={(e) => setImportTexto(e.target.value)}
              placeholder="Pegá la lista acá, un lugar por línea…"
              className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 font-sans text-sm text-ink outline-none placeholder:text-faint/60 focus:border-ink"
            />

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline">
                elegir archivo
                <input
                  type="file"
                  accept=".txt,.csv,.md,text/plain,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const contenido = await f.text();
                    setImportTexto(
                      f.name.toLowerCase().endsWith(".csv")
                        ? csvALineas(contenido).join("\n")
                        : contenido,
                    );
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="font-mono text-xs text-faint">
                {parseLista(importTexto).length.toString().padStart(2, "0")}{" "}
                items
              </span>
              <button
                onClick={importar}
                disabled={parseLista(importTexto).length === 0}
                className="ml-auto rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper transition disabled:opacity-25"
              >
                Importar
              </button>
            </div>
          </div>
        )}
      </section>

      {CATEGORIAS.map((c) => {
        const pendientesCat = pendientes.filter((i) => i.categoria === c);
        const visitadosCat = visitados.filter((i) => i.categoria === c);
        const isOpen = visitadosOpen[c];

        return (
          <section key={c} className="mb-9">
            <div className="mb-2 flex items-baseline gap-3">
              <h2
                className="font-mono text-xs uppercase tracking-[0.2em]"
                style={{ color: META[c].color }}
              >
                {META[c].label}
              </h2>
              <span className="font-mono text-xs text-faint">
                {pendientesCat.length.toString().padStart(2, "0")}
              </span>
            </div>

            {pendientesCat.length === 0 ? (
              <p className="pl-4 font-sans text-sm text-faint/60">
                sin lugares
              </p>
            ) : (
              <ul
                className="space-y-px border-l-2 pl-4"
                style={{ borderColor: META[c].color }}
              >
                {pendientesCat.map((i) => (
                  <li
                    key={i.id}
                    className="group flex items-center gap-3 py-2"
                  >
                    <button
                      aria-label="Marcar visitado"
                      onClick={() => patch(i.id, { completada: true })}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition hover:border-ink"
                      style={{ borderColor: `${META[c].color}90` }}
                    />

                    <span className="flex-1 text-ink">{i.titulo}</span>

                    <button
                      aria-label="Borrar"
                      onClick={() => borrar(i.id)}
                      className="shrink-0 font-mono text-xs text-faint opacity-0 transition hover:text-alta group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {visitadosCat.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() =>
                    setVisitadosOpen((prev) => ({ ...prev, [c]: !prev[c] }))
                  }
                  className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em] text-faint"
                >
                  <span>Visitados</span>
                  <span>{visitadosCat.length.toString().padStart(2, "0")}</span>
                  <span>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <ul className="mt-3 space-y-px">
                    {visitadosCat.map((i) => (
                      <li
                        key={i.id}
                        className="group flex items-center gap-3 py-1.5"
                      >
                        <button
                          aria-label="Reabrir"
                          onClick={() => patch(i.id, { completada: false })}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] text-paper"
                        >
                          ✓
                        </button>
                        <span className="flex-1 text-faint line-through">
                          {i.titulo}
                        </span>
                        <button
                          aria-label="Borrar"
                          onClick={() => borrar(i.id)}
                          className="shrink-0 font-mono text-xs text-faint opacity-0 transition hover:text-alta group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
