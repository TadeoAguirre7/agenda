# Plan: Agenda — App web de tareas/recordatorios con Web Push

## Contexto y decisiones fijadas
- **Stack:** Next.js (App Router, TypeScript) + React.
- **DB:** SQLite + Prisma ORM (archivo local `prisma/dev.db`).
- **Usuarios:** un solo usuario, sin login (auth queda para el futuro).
- **PWA:** instalable (manifest + service worker).
- **Recordatorios:** Web Push (`web-push` + claves VAPID). Service worker recibe el push y muestra notificación.
- **Scheduler:** endpoint cron que chequea tareas con `recordatorioAt <= now` no notificadas y dispara push. Local: `node-cron` o llamada manual; deploy: Vercel Cron.
- **Entorno:** Node v20.19.6, npm 10.8.2. Carpeta `/Users/tadeoaguirrebustamante/Documents/Proyectos/Agenda` vacía.

## Modelos de datos (Prisma)
```prisma
model Task {
  id            String   @id @default(cuid())
  titulo        String
  descripcion   String?
  prioridad     String   @default("media") // "alta" | "media" | "baja"
  fechaVencimiento DateTime?
  recordatorioAt   DateTime?
  notificado    Boolean  @default(false)   // para no repetir el push
  completada    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}
```

---

## Phase 0 — Documentación / APIs permitidas

Fuentes oficiales a consultar durante la implementación:
- Next.js App Router: https://nextjs.org/docs/app
- Route Handlers (API): https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Prisma + SQLite quickstart: https://www.prisma.io/docs/getting-started/quickstart-sqlite
- Prisma en Next.js (singleton client): https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-prisma-client-dev-practices
- Web Push (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Service Worker push/notification: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
- lib `web-push` (npm): https://www.npmjs.com/package/web-push
- PWA manifest (MDN): https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs

**APIs permitidas / patrones correctos:**
- Prisma Client singleton en dev (evitar múltiples instancias por hot-reload).
- `web-push`: `webpush.setVapidDetails(...)`, `webpush.sendNotification(subscription, payload)`.
- `webpush.generateVAPIDKeys()` para generar claves una vez.
- Cliente: `navigator.serviceWorker.register(...)`, `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
- Service worker: evento `push` → `self.registration.showNotification(...)`; evento `notificationclick`.

**Anti-patrones a evitar:**
- No usar `firebase-messaging` (innecesario; Web Push estándar alcanza).
- No instanciar `new PrismaClient()` por request en dev sin singleton.
- No olvidar `userVisibleOnly: true` (requerido por Chrome).
- VAPID keys NO van hardcodeadas: van en `.env` (y `.env` en `.gitignore`).
- iOS solo entrega push si la PWA está instalada (Add to Home Screen) en iOS 16.4+.

---

## Phase 1 — Scaffold + CRUD de tareas (sin UI fina, sin push)

**Implementar:**
1. `npx create-next-app@latest .` — TypeScript, App Router, ESLint, sin Tailwind opcional (decidir: usar Tailwind sí, simplifica estilos).
2. Instalar Prisma: `npm i -D prisma`, `npm i @prisma/client`, `npx prisma init --datasource-provider sqlite`.
3. Definir modelos `Task` y `PushSubscription` en `prisma/schema.prisma`.
4. `npx prisma migrate dev --name init`.
5. Crear `lib/prisma.ts` (singleton del Prisma Client).
6. Route Handlers en `app/api/tasks/`:
   - `GET /api/tasks` — listar.
   - `POST /api/tasks` — crear.
   - `PATCH /api/tasks/[id]` — editar/completar.
   - `DELETE /api/tasks/[id]` — borrar.

**Verificación:**
- `npx prisma studio` muestra tablas `Task` y `PushSubscription`.
- `curl -X POST localhost:3000/api/tasks -d '{"titulo":"prueba"}'` crea registro.
- `GET /api/tasks` lo devuelve.

**Guardas:** Prisma singleton presente; `.env` con `DATABASE_URL="file:./dev.db"`; `dev.db` en `.gitignore`.

---

## Phase 2 — UI: lista por prioridad, crear/editar/completar

**Implementar:**
1. Página principal `app/page.tsx`: lista de tareas agrupadas/ordenadas por prioridad (alta→media→baja), separar completadas.
2. Componente form crear/editar tarea (titulo, descripcion, prioridad, fechaVencimiento, recordatorioAt).
3. Acciones: marcar completada (checkbox → PATCH), borrar, editar.
4. Estilos con Tailwind. Colores por prioridad (alta=rojo, media=ámbar, baja=verde).
5. Estado: fetch a las route handlers; revalidar tras mutación.

**Verificación:**
- Crear/editar/completar/borrar funciona desde la UI y persiste tras refresh.
- Orden por prioridad correcto; completadas separadas.

**Nota:** considerar invocar skill `frontend-design` para dirección visual antes de estilar.

---

## Phase 3 — PWA instalable

**Implementar:**
1. `app/manifest.ts` (o `public/manifest.json`): name, short_name, icons (192/512), start_url, display: standalone, theme_color.
2. Iconos en `public/icons/`.
3. Service worker `public/sw.js` (registro básico, sin push todavía) + registro desde cliente en un componente `useEffect`.
4. Metadata en `app/layout.tsx` (theme-color, apple-mobile-web-app-capable para iOS).

**Verificación:**
- Lighthouse PWA: instalable.
- Chrome DevTools → Application → Manifest sin errores; Service Worker activo.
- Aparece prompt/opción "Instalar app".

---

## Phase 4 — Web Push (suscripción + envío)

**Implementar:**
1. `npm i web-push`. Generar VAPID keys una vez (`npx web-push generate-vapid-keys` o script). Guardar en `.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Exponer pública: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
2. Service worker `public/sw.js`: handlers `push` (showNotification) y `notificationclick` (focus/abrir app).
3. Cliente: botón "Activar recordatorios" → pide permiso `Notification.requestPermission()`, `pushManager.subscribe(...)`, manda subscription a `POST /api/push/subscribe`.
4. `POST /api/push/subscribe` — guarda en tabla `PushSubscription` (upsert por endpoint).
5. `POST /api/push/test` — manda push de prueba a todas las subs (usar `web-push`).

**Verificación:**
- Activar recordatorios crea fila en `PushSubscription`.
- `POST /api/push/test` muestra notificación en el dispositivo/navegador suscripto.
- Manejar sub expirada (410/404 → borrar de DB).

**Guardas:** `userVisibleOnly: true`; VAPID en `.env`; convertir public key a `Uint8Array` (urlBase64ToUint8Array) en el cliente.

---

## Phase 5 — Scheduler de recordatorios

**Implementar:**
1. `GET/POST /api/cron/reminders` — query tareas `recordatorioAt <= now AND notificado=false AND completada=false`; por cada una manda push a todas las subs; marca `notificado=true`. Limpiar subs muertas.
2. Local: `node-cron` en un script aparte (`scripts/cron.ts`) o instrucción de pegarle al endpoint cada minuto. Alternativa simple dev: setInterval en un pequeño server script.
3. Deploy (cuando toque): `vercel.json` con cron `* * * * *` apuntando a `/api/cron/reminders`. Proteger endpoint con header secreto (`CRON_SECRET`).

**Verificación:**
- Crear tarea con `recordatorioAt` = ahora+2min → llega push a esa hora.
- `notificado` pasa a true; no se repite el push.

**Guardas:** endpoint cron protegido con secreto; idempotente (flag `notificado`).

---

## Phase 6 — Verificación final
- Recorrer flujo completo: crear tarea con recordatorio → instalar PWA en celular → activar push → recibir notificación a la hora.
- Lighthouse PWA pass.
- `grep` anti-patrones: sin `new PrismaClient()` fuera del singleton; VAPID no hardcodeado; `userVisibleOnly` presente.
- README con: cómo correr, generar VAPID keys, instalar PWA en iOS/Android.
- Opcional: skill `security-review` sobre el diff (endpoints abiertos, secreto cron).

## Riesgos / notas
- **iOS:** push solo con PWA instalada (iOS 16.4+). Documentarlo.
- **HTTPS:** push requiere HTTPS salvo `localhost`. Para probar en celular real en LAN: usar `ngrok`/`localtunnel` o deploy a Vercel.
- **Sin login:** todas las subs reciben todos los recordatorios (ok para un usuario). Cambia al agregar auth.
