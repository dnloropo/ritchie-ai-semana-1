/* =========================================================
   Ritchie AI - Funcion serverless (Vercel)
   Recibe { question } por POST y devuelve { text }.
   La clave API vive en la variable de entorno ANTHROPIC_API_KEY.
   ========================================================= */

const SYSTEM_PROMPT = `Eres Ritchie AI, el asistente educativo de la cohorte Ritchie en Riwi.
Responde SOLO con informacion de los siguientes documentos de la cohorte.
Si la respuesta no esta en estos documentos, responde exactamente con la palabra: NO_SE

Reglas de formato:
1. Primera linea: resumen en maximo 15 palabras.
2. Luego el detalle con datos concretos (fechas, horas, pasos).
3. Ultima linea: "FUENTE: <nombre del documento>" — usa solo los nombres que aparecen abajo.
4. Nunca inventes datos. Nunca menciones APIs ni tecnologia interna.

DOCUMENTOS DE LA COHORTE:

--- Calendario de la cohorte (calendario-cohorte-demo.pdf) ---
Proxima sesion de IA: Jueves 26 de noviembre de 2026, 6:00 p.m., virtual.
Actividades pendientes:
  - Taller de prompts: vence el 27 de noviembre
  - Reflexion de la sesion 8: vence el 29 de noviembre
  - Avance del proyecto: vence el 1 de diciembre

--- Guia del proyecto (guia-proyecto-demo.pdf) ---
Fecha limite de entrega: viernes 4 de diciembre de 2026, hasta las 11:59 p.m.
Como entregar: cargar el enlace del repositorio en la plataforma de la cohorte.

--- Carpeta de materiales (materiales-cohorte-demo.pdf) ---
Contenido disponible: presentaciones de cada sesion, grabaciones de las clases, guias y plantillas.
Acceso: carpeta compartida de la cohorte.`;

const SENSITIVE = [
  "salud", "enfermo", "enferma", "enfermedad", "medic", "depres", "ansiedad",
  "estres", "triste", "suicid", "calificacion", "mis notas", "mi nota",
  "promedio", "aprobar", "reprob", "perder el curso", "situacion personal",
  "problema personal", "asunto personal", "familia", "problema con mi",
  "acoso", "maltrato", "abuso", "violencia", "expulsar", "sancionar",
];

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { question } = req.body || {};
  if (!question || typeof question !== "string") return res.status(400).json({ error: "Missing question" });
  const q = normalize(question);
  if (SENSITIVE.some((k) => q.includes(k))) return res.json({ type: "safety" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error("ANTHROPIC_API_KEY no configurada"); return res.json({ type: "error", fallback: true }); }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 400, system: SYSTEM_PROMPT, messages: [{ role: "user", content: question }] }),
    });
    if (!response.ok) { const err = await response.text(); console.error("API error:", response.status, err); return res.json({ type: "error", fallback: true }); }
    const data = await response.json();
    const text = data.content?.[0]?.text ?? "NO_SE";
    if (text.trim() === "NO_SE") return res.json({ type: "error" });
    const sourceMatch = text.match(/FUENTE:\s*(.+)$/im);
    const sourceLabel = sourceMatch ? sourceMatch[1].trim() : null;
    const bodyText = sourceMatch ? text.slice(0, sourceMatch.index).trim() : text.trim();
    const lines = bodyText.split("\n").filter(Boolean);
    const shortText = lines[0] || "";
    const detailLines = lines.slice(1);
    const detailHTML = detailLines.length ? "<p>" + detailLines.map((l) => l.replace(/^[-]\s*/, "")).join("</p><p>") + "</p>" : "";
    const SOURCE_MAP = {
      "calendario de la cohorte": { label: "Calendario de la cohorte", file: "calendario-cohorte-demo.pdf" },
      "guia del proyecto": { label: "Guia del proyecto", file: "guia-proyecto-demo.pdf" },
      "carpeta de materiales": { label: "Carpeta de materiales", file: "materiales-cohorte-demo.pdf" },
    };
    let source = null;
    if (sourceLabel) { const key = normalize(sourceLabel); for (const [pattern, val] of Object.entries(SOURCE_MAP)) { if (key.includes(pattern)) { source = val; break; } } }
    return res.json({ type: "answer", short: shortText, html: `<div class="api-answer">${detailHTML}</div>`, source });
  } catch (err) { console.error("Fetch error:", err); return res.json({ type: "error", fallback: true }); }
}
