const CACHE_NAME = "bitacora-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-512x512.svg",
  "/favicon.ico",
];

const API_BASE = "/api/";

// IndexedDB para requests pendientes
const DB_NAME = "bitacora-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-requests";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function queueRequest(url, method, body, headers) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.add({ url, method, body, headers, timestamp: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingRequests() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removePendingRequest(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncPendingRequests() {
  const pending = await getPendingRequests();
  if (pending.length === 0) return;

  for (const req of pending) {
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      if (res.ok || res.status === 404 || res.status === 409) {
        await removePendingRequest(req.id);
      }
    } catch {
      // sigue sin conexion, dejar para proximo intento
    }
  }

  // Notificar a los clientes que sincronizo
  const allClients = await clients.matchAll({ type: "window" });
  for (const client of allClients) {
    client.postMessage({ type: "SYNC_COMPLETE" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests
  if (url.pathname.startsWith(API_BASE)) {
    const isMutation = ["POST", "PATCH", "DELETE"].includes(request.method);

    if (isMutation) {
      event.respondWith(
        (async () => {
          try {
            const networkResponse = await fetch(request.clone());
            syncPendingRequests().catch(() => {});
            return networkResponse;
          } catch (error) {
            const body = await request.clone().text();
            const headers = {};
            request.headers.forEach((v, k) => { headers[k] = v; });
            await queueRequest(request.url, request.method, body, headers);

            return new Response(
              JSON.stringify({ offline: true, queued: true }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
        })(),
      );
    } else {
      event.respondWith(
        fetch(request).catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          });
        }),
      );
    }
    return;
  }

  // Navegacion: cache-first
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
        );
      }),
    );
    return;
  }

  // Assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      );
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending") {
    event.waitUntil(syncPendingRequests());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_NOW") {
    event.waitUntil(syncPendingRequests());
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Bitácora";
  const options = {
    body: data.body || "Tienes una tarea pendiente",
    icon: "/icon-512x512.svg",
    badge: "/icon-512x512.svg",
    tag: data.tag || "default",
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});
