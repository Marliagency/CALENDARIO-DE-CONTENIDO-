# ADR 002 — Brand Brain como contexto estructurado para la IA

## Estado
Aceptado · 2026-05-20

## Contexto
El studio creativo (SESIÓN 2) genera contenido específico de cada workspace.
Necesita saber qué representa la marca, a quién habla, qué tono usa, qué claims
puede hacer y qué no. La alternativa "que el usuario lo escriba en cada prompt"
no escala y es inconsistente.

## Decisión
1. Cada workspace tiene un único `BrandBrain` (1:1) con campos estructurados,
   no markdown libre.
2. Las **personas** se modelan por separado (`BuyerPersona`) — pueden vincularse
   a piezas.
3. Los **hooks ganadores** se modelan por separado (`Hook`) con resultado
   probado/no probado, persona objetivo, formato.
4. Los **assets** (logos, screenshots, ads propios, referencias, documentos) se
   modelan en `BrandAsset` con un `section` que determina cómo los interpreta la IA.
5. Los **documentos** llevan un campo `metadata.summary` generado por Claude
   al subirlos. La SESIÓN 2 lee el summary sin necesidad de descargar el
   documento completo.
6. Endpoints `GET /api/v1/w/:slug/brain/*` exponen todo este contexto vía API
   key con scope `read_brain`.

## Por qué estructurado y no "un .md gigante"
- La IA filtra mejor lo relevante cuando el input está categorizado.
- Permite UI editable inline en el frontend (no editar markdown).
- Permite versionado granular: "qué cambió en los `claims_forbidden` este mes".
- Permite reglas de QC automáticas: "rechazar si el caption contiene un
  `claim_forbidden`".

## Consecuencias
- El frontend tiene una pantalla específica para cada bloque del Brain
  (7 pestañas), no un editor genérico.
- Migraciones del Brain son aditivas: nuevos campos sin romper la API.
- La SESIÓN 2 hace un fetch al Brain al inicio de cada CreativeRun.
