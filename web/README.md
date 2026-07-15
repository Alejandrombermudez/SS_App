# SS Motos — Web (PWA)

Versión web responsive e instalable (PWA) de la app de gestión del taller, migrada desde el
proyecto Android original (`../app`). Usa el mismo proyecto de Firebase (`taller-ss`): mismas
colecciones de Firestore (`services`, `clients`, `vehicles`, `professions`) y el mismo login con
Google.

## Stack

- Vite + React + TypeScript
- Firebase Web SDK (Auth + Firestore) — tiempo real con `onSnapshot`
- Tailwind CSS v4
- `vite-plugin-pwa` (manifest + service worker, instalable en Android/iOS/desktop)
- React Router

## Correr en local

```bash
npm install
npm run dev
```

`.env.local` ya tiene la config de Firebase del proyecto `taller-ss` (no es secreta, pero no se
versiona). Si no existe, cópiala de `.env.example` y completa `VITE_FIREBASE_API_KEY` con la del
`google-services.json` del proyecto Android.

## Antes de que el login funcione en un dominio nuevo

Firebase Auth solo permite iniciar sesión con Google desde dominios autorizados. `localhost` ya
está autorizado por defecto. Cuando despliegues (Vercel, dominio propio, etc.) vas a necesitar
agregar ese dominio en:

**Firebase Console → Authentication → Settings → Authorized domains**

Si no lo haces, el botón "Ingresar con Google" va a fallar con `auth/unauthorized-domain`.

## Desplegar en Vercel

1. Sube este repo a GitHub.
2. En Vercel, importa el repo. Si el repo incluye también el proyecto Android (`../app`), en
   "Root Directory" selecciona `web`.
3. Framework preset: Vite (autodetectado). Build command `npm run build`, output `dist`.
4. Agrega las mismas variables de `.env.local` en Project Settings → Environment Variables.
5. Después del primer deploy, agrega el dominio `*.vercel.app` (o tu dominio propio) en Firebase
   como se explica arriba.

## Roles / admin

Los correos con rol admin están en `src/firebase.ts` (`ADMIN_EMAILS`), igual que en
`LoginActivity.kt` de la app Android. Es un chequeo del lado del cliente — la protección real
tiene que estar en las Firestore Security Rules del proyecto `taller-ss` (no viven en este repo,
se administran desde la consola de Firebase).

## Qué falta / pendiente

- "Crear Cotización" es un stub (tampoco estaba implementado en la app Android).
- `licenseImage` existe en el modelo `Vehicle` pero no hay UI de carga de imagen todavía
  (necesitaría Firebase Storage).
