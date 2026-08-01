---
description: Planifica y ejecuta una tarea nueva de forma autónoma (autónomo). Rama actual, SIN commits.
agent: orchestrator
# model-binding: orchestrator (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
---

Actúa como **ORQUESTADOR AUTÓNOMO** según `.agents/orchestrators/orchestrator-auto.md`.

Parámetros: **GIT=off** · **CADENCIA=continuo**.

Planifica (discovery en `searcher` (modelo de búsqueda) + skill writing-plans) y ejecuta tarea a
tarea con un `executor` fresco (modelo de implementación), sin pausas salvo el gate obligatorio
de migraciones de development. Trabaja en la **rama actual** y **NO hagas git**.

Petición: $ARGUMENTS
