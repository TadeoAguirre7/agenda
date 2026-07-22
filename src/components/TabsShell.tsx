"use client";

import { useRef, useState } from "react";
import { SignOutButton } from "@/components/AuthButtons";
import SettingsPanel from "@/components/SettingsPanel";
import { DateContext } from "@/components/DateContext";

type Tab = "todo" | "entertainment" | "restaurants";

const TABS: { id: Tab; label: string }[] = [
  { id: "todo", label: "To do list" },
  { id: "entertainment", label: "Entretenimiento" },
  { id: "restaurants", label: "Lugares" },
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
  userEmail,
}: {
  todo: React.ReactNode;
  entertainment: React.ReactNode;
  restaurants: React.ReactNode;
  userEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [selectedDate, setSelectedDate] = useState<string>(hoyStr);
  const dateInputRef = useRef<HTMLInputElement>(null);

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
              <nav className="flex shrink-0 gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition hover:bg-ink/5"
                    style={{
                      background:
                        activeTab === tab.id ? "var(--ink)" : "transparent",
                      color:
                        activeTab === tab.id ? "var(--paper)" : "var(--faint)",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              <div className="flex shrink-0 items-center gap-3">
                {/* Fecha clickable — abre el date picker */}
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (dateInputRef.current?.showPicker) {
                        dateInputRef.current.showPicker();
                      } else {
                        dateInputRef.current?.click();
                      }
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
                <SettingsPanel />
                <SignOutButton title={userEmail} />
              </div>
            </div>
          </div>
        </header>

        {activeTab === "todo" && todo}
        {activeTab === "entertainment" && entertainment}
        {activeTab === "restaurants" && restaurants}
      </div>
    </DateContext.Provider>
  );
}
