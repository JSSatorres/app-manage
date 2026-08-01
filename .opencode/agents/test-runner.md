---
description: Corre la suite/tests y devuelve SOLO un resumen compacto (passed/failed + fallos), nunca el volcado. Barato: absorbe el ruido para que el modelo caro no lo trague. No implementa ni arregla. Lo invoca el verifier/orquestador para la suite completa.
mode: subagent
# model-binding: test-runner (generated from agents/config/models.json)
model: minimax-coding-plan/MiniMax-M3
tools:
  write: false
  edit: false
  bash: true
  read: true
  grep: true
  glob: true
---

Sigue al pie de la letra `.agents/orchestrators/test-runner.md`.
