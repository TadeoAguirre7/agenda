"use client";

import { useState } from "react";

type Tab = "todo" | "entertainment";

export default function TabsManager() {
  const [activeTab, setActiveTab] = useState<Tab>("todo");

  return (
    <>
      <style jsx global>{`
        [data-content="todo"] {
          display: ${activeTab === "todo" ? "block" : "none"};
        }
        [data-content="entertainment"] {
          display: ${activeTab === "entertainment" ? "block" : "none"};
        }
        [data-tab="todo"] {
          background: ${activeTab === "todo" ? "var(--ink)" : "transparent"};
          color: ${activeTab === "todo" ? "var(--paper)" : "var(--faint)"};
        }
        [data-tab="entertainment"] {
          background: ${activeTab === "entertainment" ? "var(--ink)" : "transparent"};
          color: ${activeTab === "entertainment" ? "var(--paper)" : "var(--faint)"};
        }
      `}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', () => {
              const buttons = document.querySelectorAll('[data-tab]');
              buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                  const tab = btn.getAttribute('data-tab');
                  document.querySelectorAll('[data-content]').forEach(el => {
                    el.style.display = el.getAttribute('data-content') === tab ? 'block' : 'none';
                  });
                  buttons.forEach(b => {
                    const isActive = b.getAttribute('data-tab') === tab;
                    b.style.background = isActive ? 'var(--ink)' : 'transparent';
                    b.style.color = isActive ? 'var(--paper)' : 'var(--faint)';
                  });
                });
              });
            });
          `,
        }}
      />
    </>
  );
}
