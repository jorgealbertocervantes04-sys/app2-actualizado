# Despliegue — Simulador "Una semana en TM"

Frontend Vite + React; backend Hono/tRPC como función serverless de Vercel (`api/index.ts` → `server/`); base de datos en Supabase.

## Base de datos (Supabase)
Tablas: `sim_participantes`, `sim_sesiones`, `sim_respuestas` (RLS activado, sin políticas: solo accede el backend con la service role key).

## Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta (Supabase → Settings → API). **Nunca** en el frontend |
| `ADMIN_CODE` | Clave del panel `/admin` (obligatoria) |
| `KIMI_AGENTGW_BASE_URL` / `KIMI_AGENTGW_API_KEY` | Opcionales. Sin ellas se usa la rúbrica local |

## Desarrollo local
```
cp .env.example .env   # y rellenar
npm install
npm run dev
```

## Despliegue
Conectar el repositorio en Vercel. `vercel.json` ya define build, salida (`dist/public`) y rewrites. Cada push a la rama principal despliega.
