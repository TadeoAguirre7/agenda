"use client";

import { useCallback, useEffect, useState } from "react";
import { SignOutButton } from "@/components/AuthButtons";
import SettingsPanel from "@/components/SettingsPanel";
import { DateContext } from "@/components/DateContext";
import MiniCalendar from "@/components/MiniCalendar";

type Tab = "todo" | "entertainment" | "restaurants" | "gym";

const TABS: { id: Tab; label: string; detalle: string }[] = [
  { id: "todo", label: "To do list", detalle: "Tareas del día por franja horaria" },
  { id: "gym", label: "Gimnasio", detalle: "Tu rutina dividida en días" },
  { id: "entertainment", label: "Entretenimiento", detalle: "Pelis, series, música y libros" },
  { id: "restaurants", label: "Lugares", detalle: "Restaurantes, cafés y salidas" },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function hoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TabsShell({
  todo,
  entertainment,
  restaurants,
  gym,
  userEmail,
}: {
  todo: React.ReactNode;
  gym: React.ReactNode;
  entertainment: React.ReactNode;
  restaurants: React.ReactNode;
  userEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [selectedDate, setSelectedDate] = useState<string>(hoyStr);
  const [calAnchor, setCalAnchor] = useState<DOMRect | null>(null);
  const cerrarCal = useCallback(() => setCalAnchor(null), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const actual = TABS.find((t) => t.id === activeTab)!;

  useEffect(() => {
    if (!menuOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const hoy = hoyStr();
  const esHoy = selectedDate === hoy;

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const dateStr = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(selectedDateObj);

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
      <div>
        <header className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
          <div className="mx-auto max-w-2xl px-5 sm:px-8">
            <div className="flex items-center justify-between gap-3 overflow-x-auto py-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Abrir menú"
                  aria-expanded={menuOpen}
                  aria-controls="menu-lateral"
                  className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[5px] rounded-full transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <span className="h-[1.5px] w-4 bg-ink" />
                  <span className="h-[1.5px] w-4 bg-ink" />
                  <span className="h-[1.5px] w-4 bg-ink" />
                </button>
                <span className="truncate rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper">
                  {actual.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {/* Fecha clickable — abre el date picker */}
                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={calAnchor !== null}
                    onPointerDown={(e) => {
                      // evita que el click-afuera del calendario lo reabra
                      if (calAnchor) e.stopPropagation();
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setCalAnchor((prev) => (prev ? null : rect));
                    }}
                    className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.25em] transition hover:text-ink"
                    style={{ color: esHoy ? "var(--faint)" : "var(--ink)" }}
                    title="Cambiar fecha"
                  >
                    {dateStr}
                    <span className="text-[10px]">▾</span>
                  </button>
                  {!esHoy && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(hoy)}
                      className="absolute -right-4 -top-1 font-mono text-[10px] text-faint hover:text-ink"
                      title="Volver a hoy"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {calAnchor && (
                  <MiniCalendar
                    value={selectedDate}
                    hoy={hoy}
                    onChange={setSelectedDate}
                    onClose={cerrarCal}
                    anchor={calAnchor}
                  />
                )}
                <SettingsPanel />
                <SignOutButton title={userEmail} />
              </div>
            </div>
          </div>
        </header>

        {/* Menú lateral (fuera del header: su backdrop-blur rompe position: fixed) */}
        <div
          className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
        <nav
          id="menu-lateral"
          aria-label="Secciones"
          inert={!menuOpen}
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-rule bg-paper shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-6 pb-4 pt-6">
            <span className="font-display text-4xl leading-none text-ink">Bitácora</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
              className="rounded-full px-2 py-1 font-mono text-xs text-faint hover:text-ink"
            >
              ✕
            </button>
          </div>
          <ul className="flex-1 px-3">
            {TABS.map((tab) => {
              const on = tab.id === activeTab;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    aria-current={on ? "page" : undefined}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMenuOpen(false);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                      on ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs uppercase tracking-wider">
                        {tab.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs ${on ? "text-paper/70" : "text-faint"}`}
                      >
                        {tab.detalle}
                      </span>
                    </span>
                    {on && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-paper" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="truncate px-6 pb-6 font-mono text-[10px] text-faint">{userEmail}</p>
        </nav>

        {activeTab === "todo" && todo}
        {activeTab === "gym" && gym}
        {activeTab === "entertainment" && entertainment}
        {activeTab === "restaurants" && restaurants}
      </div>
    </DateContext.Provider>
  );
}
