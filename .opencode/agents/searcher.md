---
description: Búsqueda/discovery de SOLO LECTURA (repo y web). Devuelve conclusiones (archivo:línea o URLs), no volcados.
mode: subagent
# model-binding: searcher (generated from agents/config/models.json)
model: minimax-coding-plan/MiniMax-M3
tools:
  write: false
  edit: false
  bash: false
  read: true
  grep: true
  glob: true
  webfetch: true
  websearch: true
---

Sigue al pie de la letra `.agents/orchestrators/searcher.md`.
