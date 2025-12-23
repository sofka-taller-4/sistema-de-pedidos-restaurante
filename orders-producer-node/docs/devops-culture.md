1. Manifiesto de Colaboración Dev + Ops + QA

En el contexto del Taller 4, el Equipo 1 asume la responsabilidad de construir no solo software funcional, sino un sistema de trabajo que proteja la calidad del código de manera continua y automática.

1.1 Principios fundamentales

Colaboración sobre silos: desarrollo, operaciones y calidad trabajan como una sola unidad.

Calidad desde el inicio: los errores se previenen, no se corrigen tarde.

Automatización como regla: todo lo repetible debe automatizarse.

Aprendizaje continuo: no se culpa a personas, se mejora el sistema.

1.2 Responsabilidades por rol

Desarrolladores (Dev)

Implementar funcionalidades siguiendo TDD.

Mantener código legible y testeable.

No hacer commits sin pruebas.

Corregir fallos detectados por QA y pipeline.

Documentar decisiones técnicas.

Respetar estándares del equipo.

Participar activamente en code reviews.

Priorizar seguridad y mantenibilidad.

Operaciones (Ops)

Diseñar flujos de CI/CD confiables.

Garantizar entornos reproducibles.

Integrar pruebas al pipeline.

Asegurar despliegues controlados.

Gestionar variables de entorno.

Monitorear fallos del sistema.

Automatizar rollback cuando aplique.

Proteger credenciales y secretos.

Aseguramiento de Calidad (QA)

Definir criterios de aceptación claros.

Validar cobertura de pruebas.

Revisar resultados del pipeline.

Identificar riesgos técnicos.

Acompañar diseño de tests.

Asegurar que los tests sean confiables.

Validar escenarios negativos.

Bloquear cambios que comprometan calidad.

2. Funcionalidad Crítica Seleccionada
2.1 Nombre de la funcionalidad

Validación y Sanitización de Entrada en el endpoint crítico updateOrder

2.2 Justificación de criticidad

El endpoint updateOrder del microservicio orders-producer-node recibe información directamente desde el cliente y afecta:

Persistencia en base de datos

Notificaciones vía WebSocket

Flujo operativo de pedidos

Una entrada mal formada o maliciosa puede comprometer:

Integridad de los pedidos

Seguridad del sistema

Estabilidad del flujo completo

Por ello, la validación y sanitización de datos de entrada se considera una funcionalidad crítica dentro del concepto Production-Ready Shield.

3. Historia de Usuario Técnica
HU-TEC-001 – Validación de entrada en actualización de pedidos

Como sistema de pedidos
Quiero validar y sanitizar los datos de entrada en el endpoint updateOrder
Para prevenir inyección de datos maliciosos y garantizar la integridad del pedido antes de su procesamiento

3.1 Criterios de aceptación

CA1: Si customerName está presente y no es de tipo string, el sistema responde 400 Bad Request.

CA2: El sistema no actualiza la orden cuando los datos de entrada son inválidos.

CA3: No se envían notificaciones WebSocket si la validación falla.

CA4: El comportamiento se valida mediante pruebas unitarias.

CA5: La implementación se realiza siguiendo estrictamente TDD.

4. Implementación de TDD (Red – Green – Refactor)

La implementación de esta funcionalidad se realiza siguiendo el ciclo Red → Green → Refactor, asegurando que el comportamiento esté definido por pruebas antes de escribir código productivo.

4.1 Fase RED – Prueba que falla

Se escribe una nueva prueba unitaria para updateOrder.

La prueba exige que el sistema rechace un customerName que no sea string.

Al ejecutar las pruebas, el test falla porque el comportamiento aún no existe.

Evidencia:
docs/evidencia_RED.txt

4.2 Fase GREEN – Implementación mínima

Se implementa la validación mínima en el controlador kitchen.controller.ts.

El sistema responde 400 cuando el tipo de dato es inválido.

No se altera ninguna otra lógica existente.

Todas las pruebas pasan correctamente.

Evidencia:
docs/evidencia_GREEN.txt

4.3 Fase REFACTOR – Mejora sin romper comportamiento

Se mejora la legibilidad del código.

Se extrae la lógica de validación a funciones auxiliares si aplica.

No se modifica el comportamiento observable.

Todas las pruebas siguen pasando.

Evidencia:
docs/evidencia_REFACTOR.txt

5. Conceptos de CI/CD – Flujo Teórico
5.1 Flujo de Integración Continua (CI)

El desarrollador realiza un commit.

Se abre un Pull Request.

El pipeline de CI se ejecuta automáticamente.

Se instalan dependencias.

Se ejecutan pruebas unitarias.

Se valida cobertura mínima.

Se ejecuta análisis de calidad estática.

Si alguna etapa falla, el merge se bloquea.

5.2 Flujo de Entrega Continua (CD)

Merge aprobado en rama principal.

Se genera build del proyecto.

Se prepara artefacto desplegable.

Se realiza despliegue ficticio.

Se monitorea el estado del sistema.

En caso de fallo, se revierte el despliegue.