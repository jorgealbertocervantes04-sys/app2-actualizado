# Una semana en TM — Simulador de instructores · Instalación

## Requisitos
- Node.js 20 o superior
- Una cuenta de Google (Gmail) — la base de datos es una **hoja de Google Sheets** tuya

## Paso 1 · Crea tu hoja de Google Sheets (5 minutos)

1. Entra a https://sheets.new — se crea una hoja nueva. Ponle nombre, ej. «Semana TM — Datos».
2. En el menú: **Extensiones → Apps Script**.
3. Borra el código que aparece y **pega todo el contenido del archivo `google-sheets.gs`** (está en la raíz de este proyecto).
4. En la primera línea del script, cambia el token por uno tuyo:
   ```js
   const TOKEN = "tm-cambia-este-token";   // ← inventa una clave larga
   ```
5. Guarda (💾) y luego: **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
6. Autoriza los permisos que pida Google (es tu propio script sobre tu propia hoja).
7. Copia la **URL de la aplicación web** (termina en `/exec`).
8. Inicializa las tablas: abre en tu navegador
   `TU-URL-EXEC?action=init&token=TU-TOKEN`
   Debe responder `{"ok":true,...}` y en tu hoja aparecerán 3 pestañas:
   **participants**, **sessions** y **responses**. Ahí verás todos los datos.

## Paso 2 · Configura la app

1. Extrae la carpeta `app` **fuera de OneDrive** (por ejemplo en `C:\proyectos\app`).
2. Copia `.env.example` como `.env` y rellena:

   ```
   APP_ID=mi-app
   APP_SECRET=una-cadena-larga-y-aleatoria
   GOOGLE_SHEETS_URL=https://script.google.com/macros/s/...../exec
   GOOGLE_SHEETS_TOKEN=el-mismo-token-del-paso-1
   ADMIN_CODE=tu-clave-de-administrador
   KIMI_AGENTGW_BASE_URL=https://agent-gw.kimi.com/coding/v1
   KIMI_AGENTGW_API_KEY=tu-api-key
   ```

   - `ADMIN_CODE`: clave del panel de administración (`/admin`).
     Si no la defines, la clave por defecto es `ADMIN-2026` — cámbiala.
   - `KIMI_AGENTGW_*`: credenciales del evaluador de IA que puntúa las
     respuestas abiertas. Si se omiten, se usa una rúbrica local de respaldo.

## Paso 3 · Arranca

```
npm install
npm run dev
```

Abre http://localhost:3000

## Producción

```
npm run build
npm start
```

O con Docker (incluye Dockerfile):

```
docker build -t semana-tm .
docker run -p 3000:3000 --env-file .env semana-tm
```

## Uso
- `/` — registro y simulador (los participantes entran desde su celular)
- `/admin` — panel del facilitador:
  - **«Proyectar QR del grupo»** — pantalla con el código QR para que los
    participantes se conecten mientras das el curso
  - Seguimiento en vivo del progreso de cada participante
  - **Reporte individual**: lo que escribió e hizo en cada actividad, análisis
    del evaluador, veredicto, áreas a reforzar y plan de mejora
  - Descarga de CSV general e individual
- **Tu hoja de Google** — todos los datos crudos quedan también en las
  pestañas `participants`, `sessions` y `responses`: puedes abrirla, filtrar
  y compartirla como cualquier hoja de cálculo.

## Cómo funciona la medición
El participante nunca ve puntajes ni opciones: realiza su semana de trabajo
(inducción, prueba de manejo, inspección física de la unidad, acompañamiento
a ruta con intervenciones, retroalimentación, diagnóstico con datos y
decisión de contratación). El servidor puntúa cada actividad combinando
reglas deterministas (defectos encontrados, intervenciones acertadas) con un
evaluador de IA que analiza sus textos. El veredicto y el plan de mejora solo
se muestran en el panel de administración.

## Banco de escenarios y re-simulación
Existen **3 variantes (A, B y C)** de la inspección y del acompañamiento: las
fallas de la unidad y las conductas del operador cambian. La variante se
asigna automáticamente por intento: quien repite la semana **nunca recibe el
mismo escenario**, así las respuestas no circulan entre cohortes.
- Al terminar, el participante ve un resumen constructivo de su semana
  (fortalezas y áreas de crecimiento, sin puntajes), material de refuerzo
  y puede descargar su **constancia de participación** (imprimible en PDF).
- Si vuelve a entrar con el mismo número de empleado, inicia un **nuevo
  intento** con otra variante; el panel muestra su evolución entre intentos.

## Panel para dirección
- KPIs: participantes, semanas cerradas, promedio, aptos, con observaciones y
  **re-evaluaciones pendientes** (semanas cerradas hace más de 180 días se
  marcan «Re-evaluar»).
- **Salud de la academia**: promedio por área de toda la cohorte, ordenada de
  la más débil a la más fuerte — alimenta el plan de capacitación real.
- **Ranking comparativo**: todos los participantes comparados por área;
  toca un encabezado para ordenar por esa área.
- Cada reporte individual incluye la **evolución del instructor** (todos sus
  intentos) y el delta de mejora entre intentos.

## Solución de problemas
- **«Google Sheets no está configurado»** → falta `GOOGLE_SHEETS_URL` en `.env`.
- **«No se pudo conectar con Google Sheets»** → la URL no es la del Web App
  (debe terminar en `/exec`) o el script no está desplegado con acceso
  «Cualquier persona».
- **«Token inválido»** → el `GOOGLE_SHEETS_TOKEN` del `.env` no coincide con
  el `TOKEN` del script.
- **Si editas el script después**, recuerda: Implementar → Administrar
  implementaciones → editar → **versión nueva**; si no, los cambios no se
  aplican. Tras publicar una versión nueva del script, abre una vez
  `TU-URL-EXEC?action=init&token=TU-TOKEN`: el script migra solo las hojas
  existentes (agrega las columnas nuevas, p. ej. `variant` y `attempt`).
