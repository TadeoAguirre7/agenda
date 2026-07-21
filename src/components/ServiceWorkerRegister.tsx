"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Background Sync API (no esta en lib.dom de TypeScript)
type RegistrationWithSync = ServiceWorkerRegistration & {
  sync: { register: (tag: string) => Promise<void> };
};

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export default function ServiceWorkerRegister() {
  const [syncing, setSyncing] = useState(false);
  const isOffline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => !navigator.onLine,
    () => false,
  );

  useEffect(() => {
    // En desarrollo no registramos SW para evitar problemas con HMR y chunks
    if (window.location.hostname === "localhost") {
      navigator.serviceWorker
        ?.getRegistrations()
        ?.then((registrations) =>
          registrations.forEach((r) => r.unregister()),
        )
        ?.catch(() => {});
      return;
    }

    // Registrar SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);

          // Solicitar background sync si esta disponible
          if ("SyncManager" in window) {
            (registration as RegistrationWithSync).sync
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
          // Refrescar datos sin recargar toda la pagina
          window.dispatchEvent(new CustomEvent("SYNC_COMPLETE"));
        }
      });
    }

    // Al volver la conexion, avisar al SW que intente sincronizar
    const handleOnline = () => {
      setSyncing(true);
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SYNC_NOW" });
      }
    };

    const handleOffline = () => {
      setSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

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
