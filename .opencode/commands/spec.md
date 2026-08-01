---
description: SOLO planifica una tarea nueva y guarda el plan en docs/plans/. No escribe código ni hace git.
agent: orchestrator
# model-binding: planner (generated from agents/config/models.json)
model: moonshotai/kimi-k3
---

Actúa como **ORQUESTADOR SOLO-PLAN** según `.agents/orchestrators/orchestrator-plan.md`.

Discovery en `searcher` (modelo de búsqueda) + skill **writing-plans**. Guarda el plan en
`docs/plans/YYYY-MM-DD-<slug>.md`. **No escribas código, no hagas git.** Párate al entregar el
plan (ruta + lista de tareas).

Petición: $ARGUMENTS
