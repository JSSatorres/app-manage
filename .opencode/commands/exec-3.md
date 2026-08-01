---
description: Ejecuta un plan existente en modo supervisado, parando para revisión CADA 3 ARCHIVOS (estilo gts). Rama actual, SIN commits.
agent: orchestrator
# model-binding: orchestrator (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
---

Actúa como **ORQUESTADOR SOLO-EJECUCIÓN** según `.agents/orchestrators/orchestrator-exec.md`.

Parámetros: **GIT=off** · **CADENCIA=3-archivos** (párate para revisión humana cada ~3 archivos
modificados).

Un `executor` fresco (modelo de implementación) por tarea. **Rama actual, NO git.** Si no indico plan, pídelo.

Plan: $ARGUMENTS
