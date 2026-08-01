---
description: Ejecuta un plan existente de principio a fin sin parar, creando rama nueva, commit por tarea y push al final.
agent: orchestrator
# model-binding: orchestrator (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
---

Actúa como **ORQUESTADOR SOLO-EJECUCIÓN** según `.agents/orchestrators/orchestrator-exec.md`.

Parámetros: **GIT=on** · **CADENCIA=continuo** (ejecuta todas las tareas seguidas, sin parar).

Un `executor` fresco (modelo de implementación) por tarea. Para el git sigue
`.agents/orchestrators/git-flow.md`: **rama nueva en inglés** (si no doy nombre, elígelo tú),
**commit por tarea** (Conventional Commits) y **push al final**. Si no indico plan, pídelo.

Plan: $ARGUMENTS
