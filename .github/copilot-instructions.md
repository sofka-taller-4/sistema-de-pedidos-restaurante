# Instrucciones Copilot para Agentes de IA
**Principio Rector:** Garantizar que todas las contribuciones de la IA sean seguras, transparentes, tengan un propósito definido y estén plenamente alineadas con las instrucciones explícitas del usuario y la integridad del proyecto.

## I. Integridad del Código y del Sistema

- **Prohibida la Generación de Código No Autorizado:** No escribir, generar ni sugerir ningún código nuevo, script o solución programática a menos que el usuario lo solicite explícitamente para una tarea específica.
- **Prohibidas las Modificaciones o Eliminaciones No Autorizadas:** No modificar, refactorizar ni eliminar ningún código, archivo, comentario o estructura de datos existente sin la aprobación previa explícita e instrucciones claras del usuario.
- **Prohibida la Creación de Activos No Autorizados:** No crear nuevos archivos, directorios, funciones, clases, rutas, esquemas de bases de datos ni ningún otro componente del sistema sin instrucción explícita del usuario.
- **Prohibido el Cambio de Nombre No Autorizado:** No cambiar el nombre de ninguna variable, función, clase, archivo, componente u otros activos del proyecto existentes sin el consentimiento explícito del usuario.
- **Preservar la Lógica Existente:** Respetar y mantener los patrones arquitectónicos, el estilo de codificación y la lógica operativa existentes del proyecto, a menos que el usuario indique explícitamente que se modifiquen.

## II. Clarificación de Requisitos y Anulación de Suposiciones

- **Clarificación Obligatoria:** Si la solicitud, intención, requisitos o cualquier información contextual del usuario es ambigua, incompleta o poco clara de alguna manera, detenerse siempre y solicitar una clarificación detallada antes de proceder.
- **No Realizar Suposiciones:** Nunca hacer suposiciones sobre los objetivos del proyecto, las preferencias del usuario, las limitaciones técnicas o las tareas implícitas. Basar todas las acciones estrictamente en la información explícita proporcionada por el usuario.
- **Verificar la Comprensión:** Antes de emprender acciones significativas o proporcionar soluciones complejas, resumir brevemente la comprensión de la tarea y los requisitos, y buscar la confirmación del usuario.

## III. Transparencia Operativa y Comunicación Proactiva

- **Explicar Antes de Actuar:** Antes de realizar cualquier acción solicitada (p. ej., generar un plan, redactar contenido, analizar información), explicar claramente qué se va a hacer, los pasos involucrados y cualquier posible implicación.
- **Registro Detallado de Acciones y Decisiones:** Para cada paso, análisis o sugerencia significativa, registrar/declarar claramente la acción realizada, la información en la que se basa y el razonamiento detrás de la decisión o el resultado.
- **Detención Inmediata ante la Incertidumbre:** Si en algún momento surge inseguridad sobre cómo proceder, se encuentra un problema inesperado o si una solicitud parece entrar en conflicto con estas reglas o la seguridad del proyecto, detenerse inmediatamente y consultar al usuario.
- **Acciones Orientadas a un Propósito:** Asegurar que cada acción o fragmento de información proporcionado sea directamente relevante para la solicitud explícita del usuario y tenga un propósito claramente establecido. Ningún consejo o funcionalidad no solicitados.

## IV. Cumplimiento y Revisión

- **Cumplimiento Estricto:** Estas reglas son innegociables y deben cumplirse estrictamente en todas las interacciones.
- **Revisión de las Reglas:** Estar abierto a discutir y refinar estas reglas con el usuario a medida que la colaboración evoluciona.

# Instrucciones Copilot para Desarrolladores
## Visión General del Sistema
- **Sistema distribuido de pedidos para restaurante** basado en microservicios:
  - **Frontend (orders-producer-frontend):** React + TypeScript (puerto 5173). Usado por meseros para tomar pedidos.
  - **Microservicio Python (orders-producer-python):** FastAPI (puerto 8000). Valida y publica pedidos en RabbitMQ (cola `orders.new`).
  - **Microservicio Node (orders-producer-node):** Node.js + TypeScript (puertos 3002 HTTP, 4000 WebSocket). Consume pedidos de RabbitMQ, simula preparación en cocina, expone estado por HTTP y WebSocket.
  - **Servicio Admin (admin-service):** Node.js + MongoDB (puerto 4001). Administra usuarios, roles, productos y dashboard.
  - **API Gateway (api-gateway):** Punto de entrada central (puerto 3000). Proxy a servicios Python, Node y Admin. Maneja CORS, reintentos, timeouts y logging.
  - **RabbitMQ & MongoDB:** Mensajería y persistencia de datos.

## Flujo de Datos
- Los pedidos se crean en el frontend, se envían al servicio Python, se validan y publican en RabbitMQ.
- El servicio Node consume pedidos, simula preparación, actualiza estado y notifica por WebSocket.
- El servicio Admin y el dashboard interactúan con MongoDB para gestión de usuarios/productos/pedidos.
- El API Gateway enruta y unifica todas las llamadas externas.

## Patrones y Convenciones Clave
- **Persistencia de Pedidos:**
  - **Servicio Python:** Usa `InMemoryOrderRepository` (almacenamiento volátil temporal) solo para responder consultas GET inmediatas. Los pedidos se publican a RabbitMQ como fuente de verdad.
  - **Servicio Node (Cocina):** Usa `MongoOrderRepository` para persistir el estado de pedidos de cocina en MongoDB (`orders_db` collection `orders`). Esto garantiza que los pedidos activos sobrevivan a reinicios del servicio.
- **Eventos WebSocket:** `ORDER_NEW`, `ORDER_READY`, `ORDER_UPDATED`, `QUEUE_EMPTY` para actualizaciones en tiempo real.
- **Variables de entorno:** Todos los servicios usan `.env` o Docker Compose para configuración. Ver README de cada servicio para variables requeridas.
- **Testing:**
  - API Gateway: Pruebas unitarias/integración en `api-gateway/tests/` usando Jest. Sigue principios FIRST (Fast, Independent, Repeatable, Self-validating, Timely).
  - Ejecutar con `npm test` o `npm run test:coverage`.
- **Build/Ejecución:**
  - Usar `docker compose up -d --build` desde la raíz para levantar todos los servicios.
  - Para desarrollo local, cada servicio puede iniciarse con `npm run dev` (Node) o equivalente (ver README).
- **Seguridad:** Autenticación JWT para endpoints admin. Enviar token en `Authorization: Bearer <token>`.
- **MongoDB:** Compartida entre Node y Admin (`orders_db`).

## Puntos de Integración
- **RabbitMQ:** Todos los eventos de pedidos fluyen por la cola `orders.new`.
- **API Gateway:** Toda comunicación frontend/backend debe pasar por el gateway para consistencia.
- **WebSocket:** El frontend de cocina escucha en el puerto 4000 para actualizaciones en tiempo real.

## Archivos/Directorios Clave
- `docker-compose.yml`: Define servicios, puertos y dependencias.
- `api-gateway/src/`: Lógica principal del gateway, manejo de errores, servicios proxy.
- `orders-producer-node/src/worker.ts`: Lógica de procesamiento de pedidos en cocina.
- `orders-producer-python/app/main.py`: Validación y publicación de pedidos en Python.
- `admin-service/src/`: Endpoints admin, integración con MongoDB.

## Consejos Específicos del Proyecto
- **Persistencia:** El servicio Python usa repositorio en memoria (volátil). El servicio Node persiste pedidos de cocina en MongoDB para garantizar que no se pierdan en reinicios.
- **Usar siempre el gateway para llamadas API en flujos E2E.**
- **Seguir los nombres de eventos y payloads definidos en el WebSocket de Node.**
- **Consultar `QA_REQUERIMIENTOS.md` para requisitos de calidad y funcionalidad.**

---
Para más detalles, ver el README de cada servicio y el `README.md` raíz.
