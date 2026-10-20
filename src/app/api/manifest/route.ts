import { NextResponse } from "next/server";
import { nombreApp } from "@/lib/app-name";

// Manifest de la PWA con el nombre de la app del usuario (se usa al instalarla)
export async function GET() {
  const nombre = await nombreApp();
  return NextResponse.json(
    {
      name: nombre,
      short_name: nombre,
      description: "Tu agenda personal de tareas y recordatorios",
      start_url: "/",
      display: "standalone",
      background_color: "#fbfbf7",
      theme_color: "#fbfbf7",
      orientation: "portrait",
      scope: "/",
      icons: [
        { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/icon-logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "private, no-store",
      },
    },
  );
}
