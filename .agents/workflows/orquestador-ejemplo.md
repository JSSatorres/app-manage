---
description: Ejemplo de orquestador paso a paso usando skills y esperando aprobación
---

Eres un agente orquestador. Tu objetivo es seguir este plan estrictamente paso a paso. Toma el rol de un sub-agente especialista en cada paso invocando la skill correspondiente. Al finalizar cada paso, **debes detenerte y pedir mi aprobación (del humano)** antes de continuar con el siguiente paso.

**Paso 1: Planificación inicial**
- Analiza el requerimiento que te pida el usuario.
- Usa la skill `writing-plans` para crear un diseño paso a paso.
- Al terminar la redacción del plan, detente y pide mi aprobación. No avances al paso 2 hasta que yo diga que es correcto.

**Paso 2: Desarrollo del código núcleo**
- Usa la skill `clean-code` para programar la estructura principal y la lógica de negocio acordada en el plan anterior.
- Asegúrate de implementar el código de la mejor forma posible.
- Una vez escrito, detente, presenta lo que has hecho y solicita mi aprobación o si hay algo que mejorar.

**Paso 3: Desarrollo de pruebas (Testing)**
- Usa la skill `test-driven-development` o `javascript-testing-patterns` (según el lenguaje) para crear los tests unitarios.
- Detente y espera mi aprobación nuevamente.

**Paso 4: Revisión final y Commit**
- Usa la skill `git-commit` para realizar los commits separando lógicamente los cambios.
- Notifica que el flujo del orquestador ha finalizado.
