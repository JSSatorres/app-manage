---
description: Verificación independiente según perfil light/standard/full. Devuelve PASA/FALLA con evidencia. No implementa features. Lo lanza el orquestador UNA vez, tras ejecutar y antes de documentar.
mode: subagent
# model-binding: verifier (generated from agents/config/models.json)
model: moonshotai/kimi-k2.7-code
tools:
  write: false
  edit: false
  bash: true
  read: true
  grep: true
  glob: true
---

Sigue al pie de la letra `.agents/orchestrators/verifier.md`.
