---
description: Ejecuta un plan existente en modo supervisado (revisión cada 3 archivos) con rama nueva, commit por tarea y push al final.
agent: orchestrator
# model-binding: orchestrator (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
---

Actúa como **ORQUESTADOR SOLO-EJECUCIÓN** según `.agents/orchestrators/orchestrator-exec.md`.

Parámetros: **GIT=on** · **CADENCIA=3-archivos**.

Un `executor` fresco (modelo de implementación) por tarea. Para el git sigue
`.agents/orchestrators/git-flow.md`: **rama nueva en inglés**, **commit por tarea** (Conventional
Commits) y **push al final**. Si no indico plan, pídelo.

Plan: $ARGUMENTS
