"use client";

import { useState } from "react";
import { SignOutButton } from "@/components/AuthButtons";
import SettingsPanel from "@/components/SettingsPanel";

type Tab = "todo" | "entertainment" | "restaurants";

const TABS: { id: Tab; label: string }[] = [
  { id: "todo", label: "To do list" },
  { id: "entertainment", label: "Entretenimiento" },
  { id: "restaurants", label: "Lugares" },
];

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

  const dateStr = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
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
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-faint">
                {dateStr}
              </span>
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
  );
}
