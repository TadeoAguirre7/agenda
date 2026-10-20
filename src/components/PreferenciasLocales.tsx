"use client";

import { useLayoutEffect } from "react";

// Reaplica tema y tamaño de letra guardados en este dispositivo.
// El script inline de <head> los pone antes del primer paint, pero si React
// re-renderiza <html> (p. ej. tras un error de hidratación) borra esos
// atributos; esto los restaura después de cada montaje.
export function aplicarPreferenciasLocales() {
  const html = document.documentElement;
  try {
    const t = localStorage.getItem("theme") || "light";
    if (t === "system") delete html.dataset.theme;
    else html.dataset.theme = t === "dark" ? "dark" : "light";

    const s = localStorage.getItem("font-size");
    html.classList.remove("text-sm", "text-base", "text-lg");
    html.classList.add(s === "small" ? "text-sm" : s === "large" ? "text-lg" : "text-base");
  } catch {
    // sin localStorage: quedan los valores por defecto
  }
}

export default function PreferenciasLocales() {
  useLayoutEffect(() => {
    aplicarPreferenciasLocales();
    // otra pestaña cambió la preferencia
    window.addEventListener("storage", aplicarPreferenciasLocales);
    return () => window.removeEventListener("storage", aplicarPreferenciasLocales);
  }, []);
  return null;
}
