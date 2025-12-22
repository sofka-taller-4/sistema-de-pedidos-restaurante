# Sistema de Pedidos de Restaurante – Arquitectura Distribuida

## 1. Descripción general
Este proyecto, contenido en la carpeta raíz `sistemdepedidosrestaurante`, implementa un sistema distribuid gestión de pedidos para un restaurante de comidas rápidas.
La solución está pensada para un escenario real de operación en sala, donde:
- El **mesero** toma el pedido desde una tablet.
- El pedido viaja a un **microservicio Python (FastAPI)** que lo valida y lo envía a **RabbitMQ**.
- Un **microservicio Node.js** consume los mensajes de RabbitMQ, simula la preparación en cocina y expostado de los pedidos por **HTTP + WebSocket**.
- La **cocina** visualiza los pedidos en tiempo real, con cambios de estado de **Pendiente → En preparacióListo**.
Gran parte de los criterios funcionales y de calidad están documentados en `QA_REQUERIMIENTOS.md` (tos, casos E2E, seguridad, rendimiento, etc.).
## 2. Arquitectura del sistema
Componentes principales (según la documentación de QA y la implementación):
1. **Frontend de Toma de Pedidos (Mesero)**
 - Tech: React + TypeScript + Vite.
 - Puerto por defecto: `  `.
 - Permite seleccionar productos, cantidades, notas, nombre del cliente y mesa.
 - Envía el pedido al backend Python mediante HTTP.
2. **Backend de Pedidos – Python**
 - Tech: FastAPI.
 - Puerto por defecto: `8000`.
 - Endpoint principal: `POST /api/v1/orders/`.
 - Valida la estructura del pedido, genera el `id` y `createdAt`, y publica un mensaje en RabbitMQ (cola `or
ders.new`).
3. **Backend de Cocina – Node.js**
 - Tech: Node.js + TypeScript (Express u otro framework ligero).
 - Puerto API HTTP: `3002`.
 - Exposición de pedidos vía `GET /kitchen/orders`.
 - Simula tiempos de preparación en función de los productos.
 - Mantiene en memoria la lista de pedidos y sus estados.
4. **Servidor WebSocket**
 - Tech: Node.js (mismo proyecto `node-ms`).
 - Puerto WebSocket: `4000`.
 - Notifica eventos a la vista de cocina: `ORDER_NEW`, `ORDER_READY`, `QUEUE_EMPTY`.
5. **RabbitMQ (Message Broker)**
 - Cola principal: `orders.new`.
 - Se usa como punto de integración entre el microservicio Python y el worker de Node.js.
6. **(Opcional) Frontend de Cocina**
 - Tech: React/TypeScript o similar.
 - Escucha el WebSocket en el puerto `4000`.
 - Muestra cards de pedidos con estados, mesa, productos, notas y botones de acción.
## 3. Flujo funcional end-to-end
1. El mesero abre el **frontend de pedidos** (`http://localhost:5173`).
2. Selecciona productos (hamburguesas, papas, perros, refrescos), define cantidades y añade notas (ej.: “Sebolla”).
3. Ingresa el **nombre del cliente** (opcional) y la **mesa**.
4. Presiona **“Enviar pedido”**.
5. El frontend realiza un `POST` a `http://localhost:8000/api/v1/orders/` con un JSON similar a:
 ```json
 {
 "customerName": "Juan Pérez",
 "table": "Mesa 7",
 "items": [
 {
 "productName": "Hamburguesa",
 "quantity": 2,
 "unitPrice": 10500,
 "note": "Sin cebolla"
 }
 ]
 }
 ```
6. El backend **Python (FastAPI)**:
 - Valida los datos con Pydantic.
 - Genera un `id` (UUID) y `createdAt`.
 - Publica un mensaje en la cola `orders.new` de RabbitMQ.
7. El **worker de Node.js** (en `node-ms`):
 - Escucha la cola `orders.new` (prefetch = 1 para procesar un pedido a la vez).
 - Calcula el tiempo de preparación según productos y cantidades.
 - Cambia el estado interno del pedido a:
 - `preparing` cuando inicia la simulación.
 - `ready` cuando termina el tiempo de preparación.
 - Emite eventos WebSocket:
 - `ORDER_NEW` al recibir un nuevo pedido.
 - `ORDER_READY` al terminar.
 - `QUEUE_EMPTY` cuando no quedan pedidos en cola.
8. El **frontend de cocina** (o panel de cocina en Node) se conecta al WebSocket (`ws://localhost:4000`) y: - Escucha los eventos.
 - Actualiza el listado de pedidos y estados en tiempo real.
## 4. Estructura del proyecto
Una estructura típica del repositorio es:
```bash
sistemdepedidosrestaurante/
■■■ frontend/ # Frontend de toma de pedidos (React + TS + Vite)
■■■ python-ms/ # Microservicio de pedidos (FastAPI)
■■■ node-ms/ # Worker de cocina + API + WebSocket (Node.js)
■■■ docker-compose.yml # Orquestación de contenedores
■■■ QA_REQUERIMIENTOS.md # Documento de requerimientos y QA
```
> Nota: Ajusta los nombres de carpeta si en tu repo real difieren de estos.
## 5. Tecnologías utilizadas
- **Frontend**
 - React
 - TypeScript
 - Vite
 - WebSocket client (para vista de cocina)
- **Backends**
 - Python 3.9+ / FastAPI
 - Node.js 18+ / TypeScript
- **Mensajería**
 - RabbitMQ (cola durable `orders.new`)
- **Infraestructura**
 - Docker
 - Docker Compose
## 6. Puertos por defecto
- Frontend pedidos (mesero): `5173`
- Backend Python: `8000`
- Backend Node (API cocina): `3002`
- WebSocket server: `4000`
- RabbitMQ: `5672` (AMQP) / `15672` (panel web si está habilitado)
> Verifica el archivo `docker-compose.yml` para confirmar los puertos exactos que estás publicando.
## 7. Variables de entorno
### 7.1. Backend Python (`python-ms/.env`)
Ejemplo de variables:
```env
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
# Opcional:
# RABBITMQ_VHOST=/
```
En Docker, lo normal es que `RABBITMQ_HOST` apunte al nombre del servicio definido en `docker-composr ejemplo `rabbitmq`), no a `localhost`.
### 7.2. Backend Node (`node-ms/.env`)
```env
AMQP_URL=amqp://guest:guest@rabbitmq:5672/
API_PORT=3002
WS_PORT=4000
```
Si usas CloudAMQP u otro proveedor, la URL AMQP cambia al formato que te entregue el proveedor.
### 7.3. Frontend (`frontend/.env` o `.env.local`)
En local (sin Docker):
```env
VITE_API_URL=http://localhost:8000/api/v1/orders/
VITE_WS_URL=ws://localhost:4000
```
En Docker, la URL puede ser algo como:
```env
VITE_API_URL=http://python-ms:8000/api/v1/orders/
VITE_WS_URL=ws://node-ms:4000
```
(Dependiendo de cómo estén nombrados tus servicios en `docker-compose.yml`.)
## 8. Ejecución con Docker Compose
### 8.1. Requisitos previos
- Docker
- Docker Compose (o el comando `docker compose` integrado)
- Puertos disponibles: 5173, 8000, 3002, 4000, 5672 (y 15672 si usas el panel de RabbitMQ)
### 8.2. Levantar todo el entorno
Desde la carpeta raíz `sistemdepedidosrestaurante/`:
```bash
# Construir imágenes y levantar contenedores en segundo plano
docker compose up -d --build
```
Esto debería:
- Construir las imágenes de:
 - `frontend`
 - `python-ms`
 - `node-ms`
- Levantar un contenedor de RabbitMQ (y otros que tengas definidos en `docker-compose.yml`).
- Mapear los puertos al host (localhost).
### 8.3. Ver logs de los servicios
```bash
# Logs de todos los servicios
docker compose logs -f
# Logs de un servicio específico
docker compose logs -f python-ms
docker compose logs -f node-ms
docker compose logs -f frontend
docker compose logs -f rabbitmq
```
### 8.4. Parar y limpiar contenedores
```bash
# Detener pero conservar contenedores
docker compose stop
# Detener y eliminar contenedores, redes y volúmenes anónimos
docker compose down
# Si quieres eliminar también volúmenes:
docker compose down -v
```
### 8.5. Reconstruir solo un servicio
```bash
# Ejemplo para reconstruir solo el backend Python
docker compose up -d --build python-ms
```
## 9. Ejecución en local (sin Docker)
> Esta sección es opcional si siempre vas a usar Docker, pero es útil para desarrollo.
### 9.1. Levantar RabbitMQ localmente
Puedes usar un contenedor suelto:
```bash
docker run -d --hostname rabbitmq --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-managem```
Usuario y contraseña por defecto del panel web: `guest / guest`.
### 9.2. Backend Python (`python-ms`)
```bash
cd python-ms
python -m venv venv
source venv/bin/activate # En Windows: venv\Scripts\activate
pip install -r requirements.txt
# Ejecutar en desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Asegúrate de que las variables de entorno de RabbitMQ estén definidas (o un archivo `.env`).
### 9.3. Backend Node (`node-ms`)
```bash
cd node-ms
npm install
# o pnpm/yarn según el gestor que uses
# Ejecutar modo desarrollo
npm run dev
# o npm run start si está configurado así
```
Esto levantará:
- La API HTTP (puerto 3002 por defecto).
- El servidor WebSocket (puerto 4000 por defecto).
### 9.4. Frontend (`frontend`)
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
Luego abre en el navegador:
```text
http://localhost:5173
```
## 10. Endpoints principales
### 10.1. API de pedidos (FastAPI – Python)
- **POST** `/api/v1/orders/`
 - Recibe un pedido completo.
 - Publica mensaje en RabbitMQ.
 - Respuesta esperada (ejemplo):
 ```json
 {
 "id": "52af8779-09ba-40fa-98a4-3e3b04d6cf25",
 "customerName": "Juan Pérez",
 "table": "Mesa 7",
 "items": [...],
 "createdAt": "2025-11-20T20:40:22.667468"
 }
 ```
### 10.2. API de cocina (Node.js)
- **GET** `/kitchen/orders`
 - Retorna la lista de pedidos actualmente en memoria.
 - Cada pedido incluye: `id`, `customerName`, `table`, `items`, `createdAt`, `status`.
### 10.3. Eventos WebSocket
- `ORDER_NEW`
 - Enviado cuando llega un pedido nuevo al worker.
- `ORDER_READY`
 - Enviado cuando termina la preparación de un pedido.
- `QUEUE_EMPTY`
 - Enviado cuando no quedan pedidos pendientes.
La vista de cocina debe suscribirse a estos eventos para actualizar la UI en tiempo real.
## 11. Flujo en la interfaz de usuario
### 11.1. Frontend de pedidos (mesero)
- Selección de productos en un grid responsive.
- Carrito con:
 - Nombre del producto.
 - Cantidad (controles `+` y `-`).
 - Especificaciones (notas).
 - Total del pedido calculado automáticamente.
- Campos:
 - Nombre de cliente.
 - Mesa.
- Botón **“Enviar pedido”**:
 - Deshabilitado si no hay productos.
 - Muestra mensajes de éxito o error.
 - Limpia el carrito tras un envío exitoso.
### 11.2. Frontend de cocina
- Cards por pedido:
 - Número de pedido.
 - Mesa.
 - Lista de productos.
 - Notas/especificaciones.
 - Estado visual: `Pendiente`, `En preparación`, `Listo`.
- Actualización en tiempo real conectada al WebSocket.
- El trabajador de cocina ve claramente el flujo de la cola.
## 12. QA, pruebas y calidad
El archivo `QA_REQUERIMIENTOS.md` documenta:
- Requerimientos funcionales por módulo (Frontend, Backend Python, Backend Node, RabbitMQ).
- Casos de prueba E2E (flujo completo, múltiples pedidos, reconexión tras fallo).
- Pruebas de seguridad (validación de entrada, CORS).
- Pruebas de rendimiento (tiempos de carga y de procesamiento).
- Checklist de aprobación antes de ir a producción.

Se recomienda revisar ese archivo para entender en detalle todos los criterios de aceptación y casos de pru contemplados.

### 12.1. Tests y Coverage para SonarQube

El proyecto está completamente configurado para generar reportes de cobertura de código compatibles con SonarQube:

**🔧 Configuración implementada:**
- ✅ Frontend (React + Vitest): Genera reportes LCOV
- ✅ API Gateway (Node + Jest): Genera reportes LCOV
- ✅ Orders Producer Node (Node + Jest): Genera reportes LCOV
- ✅ Orders Producer Python (FastAPI + pytest): Genera reportes Cobertura XML

**📊 Ejecutar todos los tests y generar coverage:**

En Windows:
```bash
run-tests-coverage.bat
```

En Linux/Mac:
```bash
./run-tests-coverage.sh
```

O ejecutar tests por servicio individual:
```bash
# Frontend
cd orders-producer-frontend && npm run test:coverage

# API Gateway
cd api-gateway && npm run test:coverage

# Orders Producer Node
cd orders-producer-node && npm run test:coverage

# Orders Producer Python
cd orders-producer-python && pytest
```

**📝 Análisis de SonarQube:**
```bash
sonar-scanner \
  -Dsonar.projectKey=sistema-pedidos-restaurante \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=YOUR_SONAR_TOKEN
```

Para más detalles sobre la configuración de coverage, consulta [SONARQUBE_COVERAGE.md](./SONARQUBE_COVERAGE.md).

### 12.2. CI/CD

El proyecto soporta dos plataformas de CI/CD:

**GitHub Actions** (Principal):
- Tests automáticos en cada push/PR
- Análisis de SonarQube con coverage
- Ver: `.github/workflows/build.yml`

**Google Cloud Build** (Alternativo):
- Build y deploy de imágenes Docker
- Despliegue a Cloud Run
- Ver: `cloudbuild.yaml`

Para más detalles, consulta [CI_CD_README.md](./CI_CD_README.md).

## 13. Problemas comunes y soluciones
- **El frontend no puede llamar al backend Python**
 - Verifica que `VITE_API_URL` apunte al host correcto (en Docker, al nombre del servicio; en local, a `locahost:8000`).
 - Revisa que el contenedor de `python-ms` esté levantado (`docker compose ps`).
- **Node-ms no se conecta a RabbitMQ**
 - Confirma que el contenedor de RabbitMQ está en ejecución.
 - Verifica que `AMQP_URL` en `node-ms` use el host correcto (nombre del servicio, no `localhost` dentro dcontenedor).
- **No llegan mensajes al WebSocket en cocina**
 - Asegúrate de que el WebSocket server esté corriendo (puerto 4000).
 - Revisa que el frontend de cocina use la URL correcta (`ws://node-ms:4000` en Docker o `ws://localhost:4` en local).
- **Ordenes no se procesan en secuencia**
 - Revisa que el worker de Node.js esté configurado con `prefetch = 1` en el consumidor de RabbitMQ.
## 14. Contribución
1. Crea una rama a partir de `main`:
 ```bash
 git checkout -b feature/nueva-funcionalidad
 ```
2. Implementa tus cambios en el módulo correspondiente (`frontend`, `python-ms`, `node-ms`).
3. Asegúrate de:
 - Mantener el formato de código y estándares del proyecto.
 - Añadir o actualizar pruebas si aplica.
 - Actualizar este `README` y/o `QA_REQUERIMIENTOS.md` si cambia algún flujo.
4. Crea un Pull Request describiendo:
 - Qué problema resuelves.
 - Qué cambios hiciste.
 - Cómo se prueba.
## 15. Licencia
> Este proyecto se utiliza con fines académicos y de demostración interna.
> No está autorizado su uso en producción sin la aprobación del autor/equipo responsable.
---
**Autor / Mantenimiento:**
Equipo de desarrollo del Sistema de Pedidos de Restaurante (microservicios Python + Node + React).
Para dudas técnicas sobre despliegue y ejecución, revisa este README y el archivo de requerimientos QA.


<div align="center">

  <a href="https://github.com/LeonardoPerezSoft" target="_blank">
    <img src="https://github.com/LeonardoPerezSoft.png" width="96" alt="Avatar de LeonardoPerezSoft" />
  </a>

  <p>
    <strong>Leonardo Pérez</strong><br />
    <a href="https://github.com/LeonardoPerezSoft" target="_blank">@LeonardoPerezSoft</a>
  </p>

  <img
    src="https://github-readme-stats.vercel.app/api?username=LeonardoPerezSoft&show_icons=true&commits_year=2025"
    alt="Estadísticas GitHub de LeonardoPerezSoft"
  />
</div>

<div align="center">

  <a href="https://github.com/dayhaaCode-25" target="_blank">
    <img src="https://github.com/dayhaaCode-25.png" width="96" alt="Avatar de dayhaaCode-25" />
  </a>

  <p>
    <strong>Dayhana Acevedo</strong><br />
    <a href="https://github.com/dayhaaCode-25" target="_blank">@dayhaaCode-25</a>
  </p>

  <img
    src="https://github-readme-stats.vercel.app/api?username=dayhaaCode-25&show_icons=true&commits_year=2025"
    alt="Estadísticas GitHub de dayhaaCode-25"
  />
</div>

<div align="center">

  <a href="https://github.com/jessicasalgado-lgtm" target="_blank">
    <img src="https://github.com/jessicasalgado-lgtm.png" width="96" alt="Avatar de jessicasalgado-lgtm" />
  </a>

  <p>
    <strong>Jessica Salgado</strong><br />
    <a href="https://github.com/jessicasalgado-lgtm" target="_blank">@jessicasalgado-lgtm</a>
  </p>

  <img
    src="https://github-readme-stats.vercel.app/api?username=jessicasalgado-lgtm&show_icons=true&commits_year=2025"
    alt="Estadísticas GitHub de jessicasalgado-lgtm"
  />
</div>

<div align="center">

  <a href="https://github.com/RM92023" target="_blank">
    <img src="https://github.com/RM92023.png" width="96" alt="Avatar de RM92023" />
  </a>

  <p>
    <strong>Robinson Muñetón Jaramillo</strong><br />
    <a href="https://github.com/RM92023" target="_blank">@RM92023</a>
  </p>

  <img
    src="https://github-readme-stats.vercel.app/api?username=RM92023&show_icons=true&commits_year=2025"
    alt="Estadísticas GitHub de RM92023"
  />
</div>