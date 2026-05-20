# ADR 003 — Presupuesto por pieza, no kill switch global

## Estado
Aceptado · 2026-05-20

## Contexto
Pulse soporta boost (promocionar piezas con presupuesto pagado en Meta Ads
y TikTok Spark Ads). El patrón típico de SaaS es un "presupuesto mensual"
con un kill switch que pausa todas las campañas cuando se alcanza un techo.

Para una herramienta personal con 1 usuario decidiendo cada pieza
manualmente, ese patrón es ruido. El usuario quiere control granular:
"quiero meter 6€ en esta pieza concreta, 0€ en la siguiente, 20€ en aquella".

## Decisión
1. **No hay presupuesto mensual ni kill switch** a nivel workspace.
2. Cada `PlatformVariant` lleva un campo `boost_budget_eur` (total que el
   usuario decide invertir en ESA variante).
3. La duración (`boost_duration_days`) se elige por pieza también, no global.
4. El presupuesto diario se **calcula** (`budget / days`), no se mete a mano.
5. El UI muestra siempre el total claramente antes de confirmar: "Vas a
   gastar **6€ en total**".
6. La aprobación de boost requiere confirmación explícita por pieza.
7. El gasto acumulado se ve en el dashboard, pero no detiene nada.

## Consecuencias
- Más control, más responsabilidad: el usuario es responsable de no meter
  cantidades absurdas. No hay red de seguridad.
- Simplifica el schema: no hay tabla de "monthly budget" ni "spend ledger
  aggregated".
- Si en el futuro un cliente pide "no gastar más de X€/mes", se añade como
  validación opcional, no como mecanismo central.

## Alternativas descartadas
- Presupuesto mensual global con kill switch: contradice el flujo manual
  de aprobación pieza-a-pieza.
- Presupuesto diario fijo por workspace: rígido, no encaja con la realidad
  de "esta pieza me importa más que aquélla".
