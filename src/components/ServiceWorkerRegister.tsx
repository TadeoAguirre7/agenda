"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Registrar SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);

          // Solicitar background sync si esta disponible
          if ("SyncManager" in window) {
            (registration as any).sync
              .register("sync-pending")
              .catch(() => console.log("Background sync not granted"));
          }
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });

      // Escuchar mensajes del SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_COMPLETE") {
          setSyncing(false);
          // Recargar pagina para reflejar datos sincronizados
          window.location.reload();
        }
      });
    }

    // Detectar estado de conexion
    const handleOnline = () => {
      setIsOffline(false);
      setSyncing(true);
      // Avisar al SW que intente sincronizar ahora
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SYNC_NOW" });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-alta px-4 py-2 font-mono text-xs uppercase tracking-wider text-paper shadow-lg">
          Sin conexion — los datos se guardaran cuando vuelva
        </div>
      )}
      {syncing && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-baja px-4 py-2 font-mono text-xs uppercase tracking-wider text-paper shadow-lg">
          Sincronizando...
        </div>
      )}
    </>
  );
}
