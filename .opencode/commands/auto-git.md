---
description: Igual que /auto (autónomo) pero crea rama nueva, commit por tarea (Conventional Commits) y push al final.
agent: orchestrator
# model-binding: orchestrator (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
---

Actúa como **ORQUESTADOR AUTÓNOMO** según `.agents/orchestrators/orchestrator-auto.md`.

Parámetros: **GIT=on** · **CADENCIA=continuo**.

Planifica y ejecuta autónomo. Para el git sigue `.agents/orchestrators/git-flow.md`: crea **rama
nueva en inglés** (si no doy nombre, elígelo tú), **un commit por tarea** (Conventional Commits,
en inglés) y **push al final**. No pares salvo por el gate obligatorio de migraciones de
development o un bloqueo real.

Petición: $ARGUMENTS
