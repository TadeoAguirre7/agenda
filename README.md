# Bitácora — Agenda personal

Agenda web de tareas y entretenimiento (pelis, series, música, libros). PWA instalable con soporte offline y login con Google.

**Producción:** https://agenda-inky-beta.vercel.app

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Prisma 7** + PostgreSQL (Neon)
- **NextAuth v4** con Google OAuth
- **PWA**: service worker propio (`public/sw.js`) con cola offline en IndexedDB y background sync

## Desarrollo local

```bash
npm install
npx prisma migrate deploy   # aplica migraciones a la DB
npm run dev                 # http://localhost:3000
```

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL (Neon) |
| `NEXTAUTH_URL` | `http://localhost:3000` en local; URL de producción en Vercel |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Secreto para firmar JWTs (mismo valor en ambas) |
| `AUTH_GOOGLE_ID` | Client ID de Google OAuth |
| `AUTH_GOOGLE_SECRET` | Client Secret de Google OAuth |

El OAuth Client de Google (Console → Credentials) debe tener estas redirect URIs:

```
http://localhost:3000/api/auth/callback/google
https://agenda-inky-beta.vercel.app/api/auth/callback/google
```

## Deploy

El proyecto está conectado a GitHub: **cada push a `main` dispara un deploy automático en Vercel**.

Deploy manual (opcional):

```bash
vercel --prod
```

Las migraciones corren con `prisma migrate deploy` (script `start`); en Vercel el build corre `prisma generate` vía `postinstall`.

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Migra DB y arranca en producción |
| `npm run lint` | ESLint |
