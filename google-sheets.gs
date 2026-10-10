// ─────────────────────────────────────────────────────────────
// Google Apps Script — pégalo en tu hoja de Google:
//   Hoja → Extensiones → Apps Script → borra todo → pega esto
//   → Implementar → Nueva implementación → Aplicación web
//   → Ejecutar como: Yo · Acceso: Cualquier persona
//   → copia la URL (termina en /exec) al .env como GOOGLE_SHEETS_URL
// Pasos completos en INSTRUCCIONES.md.
// ─────────────────────────────────────────────────────────────

// Token compartido con la app (.env → GOOGLE_SHEETS_TOKEN). Cámbialo.
const TOKEN = "tm-cambia-este-token";

const SHEETS = {
  participants: ["id", "name", "employeeNo", "base", "createdAt"],
  sessions: ["id", "participantId", "status", "totalPct", "verdict", "resultJson", "variant", "attempt", "startedAt", "completedAt"],
  responses: ["id", "sessionId", "scenarioId", "optionId", "score", "payload", "aiFeedback", "answeredAt"],
};

function doPost(e) {
  return respond(handle(JSON.parse(e.postData.contents || "{}")));
}

function doGet(e) {
  // Solo para probar en el navegador: ?action=init&token=...
  return respond(handle(e.parameter || {}));
}

function respond(result) {
  let out;
  try {
    out = { ok: true, data: result };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function handle(body) {
  if (String(body.token || "") !== TOKEN) throw new Error("Token inválido");
  switch (body.action) {
    case "init":
      init();
      return { sheets: Object.keys(SHEETS) };
    case "read":
      return readAll(String(body.sheet));
    case "append":
      return append(String(body.sheet), body.row || {});
    case "update":
      return update(String(body.sheet), String(body.key), body.value, body.patch || {});
    default:
      throw new Error("Acción desconocida: " + body.action);
  }
}

// ── Inicialización (ejecuta una vez: abre la URL con ?action=init&token=TU-TOKEN)
// Crea las hojas si no existen y AGREGA columnas nuevas a hojas
// ya existentes (migración automática al actualizar el script).
function init() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const wanted = SHEETS[name];
    const lastCol = sh.getLastColumn();
    const first = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    const empty = first.every(function (c) { return c === ""; });
    if (empty) {
      sh.getRange(1, 1, 1, wanted.length).setValues([wanted]).setFontWeight("bold");
    } else {
      const current = first.map(function (c) { return String(c); });
      wanted.forEach(function (h) {
        if (current.indexOf(h) < 0) {
          sh.getRange(1, current.length + 1).setValue(h).setFontWeight("bold");
          current.push(h);
        }
      });
    }
  });
}

// Encabezados reales de la hoja (fila 1). Permite que las hojas
// existentes con columnas viejas sigan funcionando tras migrar.
function headersOf(sheet) {
  if (!SHEETS[sheet]) throw new Error("Hoja desconocida: " + sheet);
  init();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet);
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) return SHEETS[sheet];
  return sh.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (c) { return String(c); })
    .filter(function (c) { return c !== ""; });
}

// ── Lectura ──
function readAll(sheet) {
  const headers = headersOf(sheet);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function (r) { return r[0] !== "" && r[0] !== null; })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h] = r[i] === "" ? null : r[i];
      });
      return obj;
    });
}

// ── Escritura (con candado para escrituras simultáneas) ──
function append(sheet, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const headers = headersOf(sheet);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet);
    // id autoincremental si no viene
    if (row.id === undefined || row.id === null || row.id === "") {
      let max = 0;
      const lastRow = sh.getLastRow();
      if (lastRow >= 2) {
        sh.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
          const n = Number(r[0]);
          if (n > max) max = n;
        });
      }
      row.id = max + 1;
    }
    const line = headers.map(function (h) {
      const v = row[h];
      return v === undefined || v === null ? "" : v;
    });
    sh.appendRow(line);
    return row;
  } finally {
    lock.releaseLock();
  }
}

function update(sheet, key, value, patch) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const headers = headersOf(sheet);
    const keyIdx = headers.indexOf(key);
    if (keyIdx < 0) throw new Error("Columna llave desconocida: " + key);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) throw new Error("No existe la fila a actualizar");
    const range = sh.getRange(2, 1, lastRow - 1, headers.length);
    const values = range.getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][keyIdx]) === String(value)) {
        const row = values[i];
        Object.keys(patch).forEach(function (k) {
          const idx = headers.indexOf(k);
          if (idx >= 0) row[idx] = patch[k] === null ? "" : patch[k];
        });
        sh.getRange(i + 2, 1, 1, headers.length).setValues([row]);
        const obj = {};
        headers.forEach(function (h, j) { obj[h] = row[j] === "" ? null : row[j]; });
        return obj;
      }
    }
    throw new Error("No existe la fila con " + key + "=" + value);
  } finally {
    lock.releaseLock();
  }
}
