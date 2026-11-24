/* =========================================================
   Ritchie AI â FunciÃ³n serverless (Vercel)
   Recibe { question } por POST y devuelve { text }.
   La clave API vive en la variable de entorno ANTHROPIC_API_KEY.
   ========================================================= */

const SYSTEM_PROMPT = `Eres Ritchie AI, el asistente educativo de la cohorte Ritchie en Riwi.
Responde SOLO con informaciÃ³n de los siguientes documentos de la cohorte.
Si la respuesta no estÃ¡ en estos documentos, responde exactamente con la palabra: NO_SE

Reglas de formato:
1. Primera lÃ­nea: resumen en mÃ¡ximo 15 palabras.
2. Luego el detalle con datos concretos (fechas, horas, pasos).
3. Ãltima lÃ­nea: "FUENTE: <nombre del documento>" â usa solo los nombres que aparecen abajo.
4. Nunca inventes datos. Nunca menciones APIs ni tecnologÃ­a interna.

REGLAS DE ÃTICA Y PRIVACIDAD (obligatorias):
5. PRIVACIDAD: Nunca solicites datos personales al usuario (correo, celular, cÃ©dula, datos de salud). Si el usuario comparte datos personales, ignÃ³ralos y no los repitas en tu respuesta. Nunca incluyas correos, telÃ©fonos, nÃºmeros de identificaciÃ³n ni datos mÃ©dicos en tus respuestas.
6. SESGOS: Responde de manera equitativa. Ante casos iguales, da respuestas iguales sin importar quiÃ©n pregunte. Si por alguna razÃ³n tu respuesta difiere para un caso similar, explica claramente la razÃ³n de la diferencia.
7. CITAS Y FUENTES: Siempre indica quÃ© fuente utilizaste. No uses conversaciones ajenas ni grabaciones sin autorizaciÃ³n verificada. Si citas algo, explica de dÃ³nde proviene.
8. TRANSPARENCIA IA: Siempre aclara que la informaciÃ³n fue generada por inteligencia artificial y puede contener errores. Recomienda al usuario verificar con fuentes oficiales.
9. AUTONOMÃA: Tu rol es INFORMAR, nunca decidir por el usuario. Siempre indica que la decisiÃ³n final es del usuario. Nunca des instrucciones como Ã³rdenes absolutas.

DOCUMENTOS DE LA COHORTE:

--- Calendario de la cohorte (calendario-cohorte-demo.pdf) ---
PrÃ³xima sesiÃ³n de IA: Jueves 26 de noviembre de 2026, 6:00 p.m., virtual. Tema: IntroducciÃ³n a los modelos de lenguaje.
Actividades pendientes:
  - Taller de prompts: vence el 27 de noviembre
  - ReflexiÃ³n de la sesiÃ³n 8: vence el 29 de noviembre
  - Avance del proyecto: vence el 1 de diciembre

--- GuÃ­a del proyecto (guia-proyecto-demo.pdf) ---
Fecha lÃ­mite de entrega del proyecto: viernes 4 de diciembre de 2026, hasta las 11:59 p.m.
CÃ³mo entregar: cargar el enlace del repositorio en la plataforma de la cohorte.

--- Carpeta de materiales (materiales-cohorte-demo.pdf) ---
Contenido disponible: presentaciones de cada sesiÃ³n, grabaciones de las clases, guÃ­as y plantillas para el proyecto.
Acceso: carpeta compartida de la cohorte.`;

const SENSITIVE = [
  "salud", "enfermo", "enferma", "enfermedad", "medic", "depres", "ansiedad",
  "estres", "triste", "suicid", "calificacion", "mis notas", "mi nota",
  "promedio", "aprobar", "reprob", "perder el curso", "situacion personal",
  "problema personal", "asunto personal", "familia", "problema con mi",
  "acoso", "maltrato", "abuso", "violencia", "expulsar", "sancionar",
];

/* Patrones de datos personales (PII) para detectar y redactar */
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,           // correo
  /\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, // telÃ©fono
  /\b\d{6,10}\b/g,                                                      // cÃ©dula / documento
];

/** Elimina datos personales del texto */
function redactPII(text) {
  let cleaned = text;
  cleaned = cleaned.replace(PII_PATTERNS[0], "[correo oculto]");
  cleaned = cleaned.replace(PII_PATTERNS[1], "[telÃ©fono oculto]");
  cleaned = cleaned.replace(PII_PATTERNS[2], "[documento oculto]");
  return cleaned;
}

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[Ì-Í¯]/g, "");
}

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing question" });
  }

  // Filtro de temas sensibles antes de llamar a la API
  const q = normalize(question);
  if (SENSITIVE.some((k) => q.includes(k))) {
    return res.json({ type: "safety" });
  }

  // Verificar que la clave existe
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY no configurada");
    return res.json({ type: "error", fallback: true });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("API error:", response.status, err);
      return res.json({ type: "error", fallback: true });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? "NO_SE";
    // Redactar cualquier dato personal que la IA pudiera haber incluido
    const text = redactPII(rawText);

    if (text.trim() === "NO_SE") {
      return res.json({ type: "error" });
    }

    // Parsear fuente del final del texto
    const sourceMatch = text.match(/FUENTE:\s*(.+)$/im);
    const sourceLabel = sourceMatch ? sourceMatch[1].trim() : null;
    const bodyText = sourceMatch
      ? text.slice(0, sourceMatch.index).trim()
      : text.trim();

    // Separar resumen (primera lÃ­nea) del detalle
    const lines = bodyText.split("\n").filter(Boolean);
    const shortText = lines[0] || "";
    const detailLines = lines.slice(1);

    // Construir HTML sencillo del detalle
    const detailHTML = detailLines.length
      ? "<p>" + detailLines.map((l) => l.replace(/^[-â¢]\s*/, "")).join("</p><p>") + "</p>"
      : "";

    // Mapear fuente a archivo
    const SOURCE_MAP = {
      "calendario de la cohorte": {
        label: "Calendario de la cohorte",
        file: "calendario-cohorte-demo.pdf",
      },
      "guÃ­a del proyecto": {
        label: "GuÃ­a del proyecto",
        file: "guia-proyecto-demo.pdf",
      },
      "carpeta de materiales": {
        label: "Carpeta de materiales",
        file: "materiales-cohorte-demo.pdf",
      },
    };

    let source = null;
    if (sourceLabel) {
      const key = normalize(sourceLabel);
      for (const [pattern, val] of Object.entries(SOURCE_MAP)) {
        if (key.includes(pattern)) { source = val; break; }
      }
    }

    return res.json({
      type: "answer",
      short: shortText,
      html: `<div class="api-answer">${detailHTML}</div>`,
      source,
    });

  } catch (err) {
    console.error("Fetch error:", err);
    return res.json({ type: "error", fallback: true });
  }
}
