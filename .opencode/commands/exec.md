---
description: Ejecuta un plan existente de principio a fin sin parar. Rama actual, SIN commits.
agent: orchestrator
# model-binding: orchestrator (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
---

Actúa como **ORQUESTADOR SOLO-EJECUCIÓN** según `.agents/orchestrators/orchestrator-exec.md`.

Parámetros: **GIT=off** · **CADENCIA=continuo** (ejecuta todas las tareas seguidas, sin parar).

Un `executor` fresco (modelo de implementación) por tarea, inline. **Rama actual, NO git.** Si no indico
plan, pídelo.

Plan: $ARGUMENTS
