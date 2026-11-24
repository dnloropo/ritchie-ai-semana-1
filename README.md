# Ritchie AI · Clan IA (maqueta)

Maqueta de un asistente educativo para una cohorte. Es una demostración: **todas las respuestas son simuladas y los datos (fechas, contactos, documentos) son ficticios**, no información oficial.

**Demo:** https://ritchie-ai-semana-1.vercel.app

## Qué muestra

1. **Consulta clara:** campo de texto y preguntas de ejemplo para empezar.
2. **Señal de espera:** "Pensando..." mientras responde.
3. **Respuesta corta** arriba y el detalle debajo.
4. **Fuente** de cada respuesta, debajo de ella.
5. **Error honesto con salida:** si no sabe, lo dice y ofrece reformular la pregunta o hablar con un coach.
6. **Aviso de límites a la vista:** el asistente puede equivocarse; verifica la fuente.
7. **Salida a una persona:** botón de coach, y los temas sensibles (salud, calificaciones, situaciones personales) se derivan a una persona.

## Cómo usarlo

Abre `index.html` en el navegador. No necesita instalación ni servidor.

## Archivos

- `index.html`: estructura y ventanas (coach, ayuda, documento).
- `styles.css`: estilos.
- `app.js`: respuestas simuladas, filtro de temas sensibles e historial (guardado en el navegador).
- `HALLAZGOS.md`: resultados de la prueba con otro equipo.
