# Diagrama de Arquitectura - Sistema de Pedidos de Restaurante

## 📊 Arquitectura General del Sistema

Este documento describe la arquitectura distribuida de microservicios del sistema de gestión de pedidos de restaurante.

## 🎨 Diagrama de Componentes y Flujo de Datos

```mermaid
graph TB
    subgraph "Cliente - Navegador"
        Browser[🌐 Navegador Web<br/>localhost:5173]
    end

    subgraph "Frontend Container - Puerto 5173"
        Nginx[Nginx:8080<br/>Reverse Proxy]
        ReactApp[React SPA<br/>Static Files]
        WSClient[WebSocket Client]
    end

    subgraph "API Gateway - Puerto 3000"
        Gateway[Express Gateway<br/>CORS, Auth, Logging]
        OrdersProxy[OrdersProxyService]
        KitchenProxy[KitchenProxyService]
        AdminProxy[AdminProxyService]
    end

    subgraph "Python Service - Puerto 8000"
        FastAPI[FastAPI Server<br/>/api/v1/orders/]
        PyService[OrderService<br/>Validación Pydantic]
        PyRepo[InMemoryRepository<br/>Volátil - solo buffer]
        PyPublisher[RabbitMQ Publisher]
    end

    subgraph "RabbitMQ - Puertos 5672, 15672"
        Queue[Cola: orders.new<br/>durable]
        DLQ[Cola: orders.failed<br/>Dead Letter Queue]
    end

    subgraph "Node Service - Puertos 3002, 4000"
        Worker[RabbitMQ Consumer<br/>prefetch=1]
        NodeAPI[Express HTTP API<br/>:3002]
        WSServer[WebSocket Server<br/>:4000]
        NodeRepo[MongoOrderRepository<br/>Persistente en MongoDB]
        Factory[Order Factory<br/>Strategy Pattern]
    end

    subgraph "Admin Service - Puerto 4001"
        AdminAPI[Express API<br/>Auth, Users, Products]
        AdminAuth[JWT Authentication<br/>HttpOnly Cookies]
    end

    subgraph "MongoDB - Puerto 27017"
        MongoDB[(MongoDB<br/>orders_db)]
        OrdersCol[(orders<br/>pedidos de cocina)]
        UsersCol[(users)]
        ProductsCol[(products)]
        CategoriesCol[(categories)]
    end

    %% Conexiones Frontend
    Browser -->|HTTP GET/POST| Nginx
    Nginx -->|Sirve archivos| ReactApp
    Nginx -->|Proxy /api/*| Gateway
    Browser -->|WebSocket| WSClient
    WSClient <-->|ws://localhost:4000| WSServer

    %% Conexiones API Gateway
    Gateway --> OrdersProxy
    Gateway --> KitchenProxy
    Gateway --> AdminProxy
    OrdersProxy -->|HTTP| FastAPI
    KitchenProxy -->|HTTP| NodeAPI
    AdminProxy -->|HTTP| AdminAPI

    %% Flujo Python Service
    FastAPI --> PyService
    PyService --> PyRepo
    PyService --> PyPublisher
    PyPublisher -->|Publish| Queue

    %% Flujo RabbitMQ
    Queue -->|Consume| Worker
    Worker -.->|Failed messages| DLQ

    %% Flujo Node Service
    Worker --> Factory
    Factory --> NodeRepo
    Worker -->|Broadcast| WSServer
    NodeAPI --> NodeRepo
    NodeRepo -->|Persist orders| OrdersCol
    NodeRepo -->|Read products| ProductsCol

    %% Flujo Admin Service
    AdminAPI --> AdminAuth
    Browser -.->|Direct login| AdminAPI
    AdminAPI --> UsersCol
    AdminAPI --> ProductsCol
    AdminAPI --> CategoriesCol

    %% Conexiones MongoDB
    MongoDB --> OrdersCol
    MongoDB --> UsersCol
    MongoDB --> ProductsCol
    MongoDB --> CategoriesCol

    %% Estilos
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef gateway fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    classDef python fill:#3776ab,stroke:#333,stroke-width:2px,color:#fff
    classDef node fill:#339933,stroke:#333,stroke-width:2px,color:#fff
    classDef queue fill:#ff6600,stroke:#333,stroke-width:2px,color:#fff
    classDef db fill:#47a248,stroke:#333,stroke-width:2px,color:#fff
    classDef admin fill:#e34f26,stroke:#333,stroke-width:2px,color:#fff

    class Browser,Nginx,ReactApp,WSClient frontend
    class Gateway,OrdersProxy,KitchenProxy,AdminProxy gateway
    class FastAPI,PyService,PyRepo,PyPublisher python
    class Worker,NodeAPI,WSServer,NodeRepo,Factory node
    class Queue,DLQ queue
    class MongoDB,OrdersCol,UsersCol,ProductsCol,CategoriesCol db
    class AdminAPI,AdminAuth admin
```

---

## 🔄 Flujo 1: Creación de Pedido (Mesero → Cocina)

```mermaid
sequenceDiagram
    participant M as Mesero (Browser)
    participant N as Nginx:8080
    participant G as API Gateway:3000
    participant P as Python Service:8000
    participant R as RabbitMQ
    participant W as Node Worker
    participant WS as WebSocket:4000
    participant K as Cocina (Browser)

    M->>N: POST /api/orders<br/>{customerName, table, items}
    N->>G: Proxy a /api/orders
    G->>P: POST /api/v1/orders/
    
    Note over P: Valida con Pydantic<br/>Genera UUID + timestamp
    
    P->>P: Guarda en InMemoryRepository<br/>(volátil - solo buffer)
    P->>R: Publish a cola 'orders.new'
    P-->>G: 201 Created {order}
    G-->>N: Response
    N-->>M: Order confirmada
    
    Note over R,W: Procesamiento asíncrono
    
    R->>W: Consume mensaje (prefetch=1)
    W->>W: Enriquece con tiempos<br/>desde MongoDB
    W->>W: Crea KitchenOrder<br/>(Factory Pattern)
    W->>W: Persiste en MongoDB<br/>(collection: orders)
    W->>WS: Broadcast ORDER_NEW
    WS->>K: {type: "ORDER_NEW", order}
    
    Note over K: Actualiza UI<br/>Muestra nuevo pedido
```

---

## 🔄 Flujo 2: Actualización de Estado en Cocina

```mermaid
sequenceDiagram
    participant K as Cocina (Browser)
    participant N as Nginx:8080
    participant G as API Gateway:3000
    participant NodeAPI as Node API:3002
    participant Repo as MongoOrderRepository
    participant DB as MongoDB
    participant WS as WebSocket:4000
    participant K2 as Otros Clientes Cocina

    K->>N: PATCH /api/kitchen/orders/{id}<br/>{status: "preparing"}
    N->>G: Proxy a /api/kitchen/orders/{id}
    G->>NodeAPI: PATCH /kitchen/orders/{id}
    
    NodeAPI->>Repo: updateStatus(id, status)
    Repo->>DB: UPDATE orders SET status
    DB-->>Repo: Confirmación
    Repo-->>NodeAPI: Order actualizada
    
    NodeAPI->>WS: notifyClients({type: "ORDER_STATUS_CHANGED"})
    NodeAPI-->>G: 200 OK {order}
    G-->>N: Response
    N-->>K: Confirmación
    
    WS->>K2: Broadcast a todos los clientes
    
    Note over K2: Actualización en tiempo real<br/>sin refrescar página
```

---

## 🔄 Flujo 3: Login y Gestión Administrativa

```mermaid
sequenceDiagram
    participant A as Admin (Browser)
    participant AS as Admin Service:4001
    participant DB as MongoDB
    participant G as API Gateway:3000

    Note over A,AS: Login directo (sin Gateway)
    
    A->>AS: POST /admin/auth/login<br/>{email, password}
    AS->>DB: Busca usuario en 'users'
    DB-->>AS: Usuario encontrado
    AS->>AS: Valida contraseña (bcrypt)
    AS->>AS: Genera JWT tokens<br/>(access + refresh)
    AS-->>A: Set cookies HttpOnly<br/>+ user data
    
    Note over A,G: Operaciones protegidas (con Gateway)
    
    A->>G: GET /api/admin/products<br/>Cookie: accessToken
    G->>G: Valida JWT
    G->>AS: GET /admin/products
    AS->>DB: Query collection 'products'
    DB-->>AS: Lista de productos
    AS-->>G: 200 OK {products}
    G-->>A: Response con productos
```

---

## 📡 Diagrama de Comunicación WebSocket

```mermaid
graph LR
    subgraph "Clientes Conectados"
        C1[Cliente Cocina 1]
        C2[Cliente Cocina 2]
        C3[Cliente Cocina 3]
    end

    subgraph "Node Service:4000"
        WS[WebSocket Server<br/>ws.WebSocketServer]
        Worker[RabbitMQ Worker]
    end

    C1 <-->|Conexión persistente| WS
    C2 <-->|Conexión persistente| WS
    C3 <-->|Conexión persistente| WS

    Worker -->|notifyClients| WS
    
    Note1[Eventos:<br/>• ORDER_NEW<br/>• ORDER_READY<br/>• ORDER_UPDATED<br/>• QUEUE_EMPTY]
    
    Worker -.-> Note1
```

---

## 🗂️ Estructura de Datos - Orden

### OrderMessage (Python Service → RabbitMQ)
```json
{
  "id": "uuid-v4",
  "customerName": "Juan Pérez",
  "table": "Mesa 5",
  "items": [
    {
      "productName": "Hamburguesa",
      "quantity": 2,
      "unitPrice": 10500,
      "note": "Sin cebolla"
    }
  ],
  "createdAt": "2024-01-02T20:30:00.000Z",
  "status": "pendiente"
}
```

### KitchenOrder (Node Service - In Memory)
```json
{
  "id": "uuid-v4",
  "customerName": "Juan Pérez",
  "table": "Mesa 5",
  "items": [
    {
      "productName": "Hamburguesa",
      "quantity": 2,
      "unitPrice": 10500,
      "note": "Sin cebolla",
      "preparationTimeSeconds": 300
    }
  ],
  "createdAt": "2024-01-02T20:30:00.000Z",
  "status": "pending" | "preparing" | "ready" | "completed" | "cancelled"
}
```

---

## 🏗️ Patrones de Diseño Implementados

### 1. **Proxy Pattern** (API Gateway)
```typescript
// api-gateway/src/services/OrdersProxyService.ts
export class OrdersProxyService extends ProxyService {
  constructor() {
    super(SERVICES.PYTHON_MS, env.PYTHON_MS_URL);
  }
}
```
**Propósito**: Punto de entrada único que abstrae la comunicación con microservicios.

### 2. **Chain of Responsibility** (Error Handling)
```typescript
// api-gateway/src/handlers/
const errorHandlers: IErrorHandler[] = [
  new MicroserviceErrorHandler(),
  new ConnectionRefusedErrorHandler(),
  new TimeoutErrorHandler(),
  new UnknownErrorHandler(),
];
```
**Propósito**: Manejo modular y extensible de diferentes tipos de errores.

### 3. **Factory Pattern** (Order Creation)
```typescript
// orders-producer-node/src/application/factories/order.factory.ts
export function createKitchenOrderFromMessage(msg: OrderMessage): KitchenOrder {
  return {
    id: msg.id || uuidv4(),
    customerName: msg.customerName,
    table: msg.table,
    items: msg.items,
    createdAt: msg.createdAt || new Date().toISOString(),
    status: "pending"
  };
}
```
**Propósito**: Encapsula la lógica de creación de objetos complejos.

### 4. **Strategy Pattern** (Preparation Time Calculation)
```typescript
// orders-producer-node/src/domain/strategies/
interface PreparationStrategy {
  calculate(items: OrderItem[]): number;
}

class ExactNameStrategy implements PreparationStrategy { }
class FixedTimeStrategy implements PreparationStrategy { }
```
**Propósito**: Diferentes algoritmos de cálculo de tiempo intercambiables.

### 5. **Repository Pattern** (Data Access)

#### **Python Service - InMemoryOrderRepository**
```python
# orders-producer-python/app/repositories/order_repository.py
class InMemoryOrderRepository(OrderRepository):
    def __init__(self):
        self._orders = {}  # Diccionario en memoria
    
    def add(self, order: OrderMessage) -> None:
        self._orders[order.id] = order
    
    def get(self, order_id: str) -> Optional[OrderMessage]:
        return self._orders.get(order_id)
```

**Características:**
- ✅ **Volátil**: Los datos se pierden al reiniciar el servicio
- ✅ **Buffer temporal**: Solo para responder GET `/api/v1/orders/{id}` inmediatamente después de crear
- ✅ **No crítico**: RabbitMQ es la fuente de verdad, no este repositorio
- ✅ **Stateless**: El Python Service no mantiene estado de negocio

**Justificación**: El Python Service solo necesita validar y publicar. No requiere persistencia porque:
1. Los pedidos se publican inmediatamente a RabbitMQ
2. El Node Service se encarga del estado de cocina
3. Responde consultas GET solo para confirmación inmediata

#### **Node Service - MongoOrderRepository**
```typescript
// orders-producer-node/src/infrastructure/database/repositories/mongo.order.repository.ts
export class MongoOrderRepository implements OrderRepository {
  private collectionName = "orders";

  async create(order: KitchenOrder): Promise<void> {
    const col = await this.collection();
    await col.insertOne(order);  // ← Persiste en MongoDB
  }

  async updateStatus(id: string, status: KitchenOrder["status"]): Promise<boolean> {
    const col = await this.collection();
    const res = await col.updateOne({ id }, { $set: { status } });
    return res.matchedCount > 0;
  }
}
```

**Características:**
- ✅ **Persistente**: Los datos sobreviven a reinicios del servicio
- ✅ **Collection**: `orders_db.orders`
- ✅ **Estado de negocio**: Mantiene el estado actual de pedidos de cocina
- ✅ **Crítico**: Evita pérdida de pedidos activos

**Justificación**: El Node Service necesita persistencia porque:
1. Los pedidos de cocina tienen ciclo de vida largo (pending → preparing → ready)
2. Un reinicio del servicio no debe perder pedidos activos
3. Permite trazabilidad y consultas históricas
4. La cocina depende de este estado para su operación

**Propósito General**: Abstrae la lógica de persistencia permitiendo diferentes implementaciones según necesidades del servicio.

---

#### 📊 Comparación de Repositorios

| Aspecto | Python - InMemory | Node - MongoDB |
|---------|------------------|----------------|
| **Persistencia** | ❌ Volátil | ✅ Persistente |
| **Propósito** | Buffer temporal | Estado de negocio |
| **Crítico** | ❌ No | ✅ Sí |
| **Collection** | N/A | `orders` |
| **Sobrevive reinicio** | ❌ No | ✅ Sí |
| **Justificación** | Solo validar/publicar | Mantener estado de cocina |

---

## 🔐 Seguridad Implementada

### 1. **Autenticación JWT**
- Tokens en cookies HttpOnly (previene XSS)
- Access token + Refresh token
- Validación en API Gateway para rutas `/api/admin/*`

### 2. **CORS Configurado**
```typescript
cors({
  origin: 'http://localhost:5173',
  credentials: true
})
```

### 3. **Sanitización NoSQL**
```typescript
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Sanitized malicious key: ${key}`);
  }
}));
```
**Previene**: Inyección NoSQL mediante operadores MongoDB (`$where`, `$gt`, etc.)

### 4. **Validación de Entrada**
- **Python**: Pydantic models
- **Node/Gateway**: Zod schemas
- **Propósito**: Prevenir datos malformados o maliciosos

---

## 📊 Puertos y Endpoints

| Servicio | Puerto | Protocolo | Endpoints Principales |
|----------|--------|-----------|----------------------|
| **Frontend** | 5173 | HTTP | UI de Mesero y Cocina |
| **API Gateway** | 3000 | HTTP | `/api/orders`, `/api/kitchen`, `/api/admin` |
| **Python Service** | 8000 | HTTP | `/api/v1/orders/` |
| **Node API** | 3002 | HTTP | `/kitchen/orders` |
| **Node WebSocket** | 4000 | WebSocket | Eventos en tiempo real |
| **Admin Service** | 4001 | HTTP | `/admin/auth`, `/admin/users`, `/admin/products` |
| **RabbitMQ** | 5672 | AMQP | Cola: `orders.new` |
| **RabbitMQ Mgmt** | 15672 | HTTP | Panel de administración |
| **MongoDB** | 27017 | MongoDB | Base de datos: `orders_db` |

---

## 🚀 Comandos de Ejecución

### Iniciar todos los servicios
```bash
docker compose up -d --build
```

### Ver logs de un servicio específico
```bash
docker logs front -f
docker logs api-gateway -f
docker logs python-ms -f
docker logs node-ms -f
docker logs admin-service -f
```

### Verificar estado de servicios
```bash
docker compose ps
```

### Reiniciar un servicio específico
```bash
docker compose restart front
```

### Detener todos los servicios
```bash
docker compose down
```

---

## 🔍 Verificación de Funcionamiento

### 1. Frontend
```bash
curl http://localhost:5173
```

### 2. API Gateway
```bash
curl http://localhost:3000/api/health
```

### 3. Python Service
```bash
curl http://localhost:8000/docs  # Swagger UI
```

### 4. Node Service
```bash
curl http://localhost:3002/kitchen/orders
```

### 5. Admin Service
```bash
curl http://localhost:4001/health
```

### 6. RabbitMQ Management
Abrir en navegador: http://localhost:15672
- Usuario: `guest`
- Contraseña: `guest`

### 7. WebSocket Connection Test
```javascript
const ws = new WebSocket('ws://localhost:4000');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

---

## 📚 Referencias

- **AGENTS.md**: Guía para agentes de código (comandos, estilos, convenciones)
- **QA_REQUERIMIENTOS.md**: Requisitos de calidad y casos de test
- **SECURITY_AUDIT_AND_IMPROVEMENT_PLAN.md**: Guías de seguridad
- **README.md**: Visión general del sistema y configuración
- READMEs específicos en cada subdirectorio de servicio

---

## 🐛 Troubleshooting Común

### Problema: Frontend no carga (ERR_SOCKET_NOT_CONNECTED)
**Causa**: Puerto interno de Nginx (8080) no coincide con mapeo en docker-compose (5173:5173)  
**Solución**: Cambiar a `5173:8080` en docker-compose.yml

### Problema: CORS errors
**Causa**: CORS_ORIGIN no configurado correctamente  
**Solución**: Verificar que todos los servicios tengan `CORS_ORIGIN=http://localhost:5173`

### Problema: WebSocket no conecta
**Causa**: URL incorrecta o puerto no expuesto  
**Solución**: Verificar `VITE_NODE_MS_URL=http://localhost:4000` y mapeo `4000:4000`

### Problema: Pedidos no aparecen en cocina
**Causa**: Worker de RabbitMQ no está consumiendo  
**Solución**: Verificar logs de node-ms y conexión a RabbitMQ

### Problema: Autenticación falla
**Causa**: JWT_SECRET diferente entre servicios  
**Solución**: Asegurar mismo `JWT_SECRET` en api-gateway y admin-service

### Problema: Pedidos se pierden al reiniciar Node Service
**Causa**: Esto NO debería pasar - el sistema usa MongoDB para persistencia  
**Solución**: Verificar que `USE_MONGO=true` y `MONGO_URI` estén configurados correctamente

---

## 📜 Evolución del Sistema - Migración de Persistencia

### Historia de la Arquitectura

**Versión Inicial (Documentada)**:
- Python Service: InMemoryRepository ✅
- Node Service: InMemoryRepository ❌ (documentado pero nunca implementado así)

**Versión Actual (Implementada)**:
- Python Service: InMemoryRepository ✅ (sin cambios)
- Node Service: MongoOrderRepository ✅ (migrado a MongoDB)

### Razón de la Migración

Según `USER_HISTORY.md`:
> "Migrar la persistencia de pedidos desde memoria a MongoDB para garantizar persistencia, escalabilidad y trazabilidad."

**Beneficios logrados:**
1. ✅ **Persistencia**: Pedidos no se pierden en reinicios
2. ✅ **Escalabilidad**: Múltiples instancias pueden compartir estado
3. ✅ **Trazabilidad**: Histórico completo de pedidos
4. ✅ **Confiabilidad**: Estado de cocina siempre disponible

**Trade-offs aceptados:**
- Mayor complejidad de infraestructura (requiere MongoDB)
- Latencia ligeramente mayor (I/O de disco vs memoria)
- Dependencia adicional en el stack

### Actualización de Documentación (2 enero 2026)

Esta documentación ha sido actualizada para reflejar la implementación real del sistema:
- ✅ `.github/copilot-instructions.md` - Corregido
- ✅ `AGENTS.md` - Corregido
- ✅ `ARCHITECTURE_DIAGRAM.md` - Corregido con detalles completos

---

**Última actualización**: 2 de enero de 2026  
**Versión del sistema**: 1.0.0  
**Documentación sincronizada con implementación**: ✅
