# Fase 4: Configuración de Postman Testing

**Fecha**: 2026-01-02
**Estado**: Lista para Implementación
**Duración Estimada**: 4-6 horas
**Riesgo**: BAJO
**Objetivo**: Crear suite completa de testing automatizado con Postman para validar arquitectura centralizada

---

## 📋 Resumen Ejecutivo

### Problema
La validación de la arquitectura centralizada requiere testing exhaustivo de todas las rutas, autenticación, WebSocket, y edge cases. Testing manual es propenso a errores y no escalable.

### Solución
Crear una Postman Collection completa con variables de entorno, pre-request scripts, post-scripts, y test assertions que validen automáticamente todos los aspectos de la arquitectura centralizada.

### Beneficios
- ✅ Testing automatizado y reproducible
- ✅ Validación completa de arquitectura centralizada
- ✅ Detección temprana de regressions
- ✅ Documentación viva de APIs
- ✅ CI/CD integration posible

---

## 📁 Estructura de Postman Collection

### Collection Principal
```
📁 API Gateway Centralization Testing Suite
├── 📁 Environments
│   ├── 🔧 local.postman_environment.json
│   └── 🔧 staging.postman_environment.json
├── 📁 Auth
│   ├── 🔐 Login Admin
│   ├── 🔐 Logout Admin
│   └── 🔄 Refresh Token (si aplica)
├── 📁 Orders
│   ├── 📝 Create Order
│   ├── 📖 Get Order by ID
│   ├── 📋 List Kitchen Orders
│   └── ✅ Update Order Status
├── 📁 Admin
│   ├── 👥 List Users
│   ├── 👤 Get User by ID
│   ├── 🛍️ List Products
│   ├── 📊 Dashboard Orders
│   ├── 📊 Dashboard Metrics
│   └── 👨‍💼 User Management (CRUD)
├── 📁 WebSocket
│   ├── 🔌 WebSocket Health Check
│   ├── 📡 Simulate ORDER_NEW
│   └── 📡 Simulate ORDER_READY
├── 📁 Health Checks
│   ├── 🏥 API Gateway Health
│   ├── 🏥 Python Service Health
│   ├── 🏥 Node Service Health
│   └── 🏥 Admin Service Health
└── 📁 Edge Cases
    ├── 🚫 Invalid Auth
    ├── 🚫 Invalid Order Data
    ├── 🚫 WebSocket Unauthorized
    └── 🚫 Rate Limiting
```

---

## 🔧 Configuración de Environments

### Local Environment
**Archivo**: `postman/environments/local.postman_environment.json`

```json
{
  "id": "local-env",
  "name": "Local Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "description": "API Gateway base URL",
      "enabled": true
    },
    {
      "key": "websocket_url",
      "value": "ws://localhost:3000/ws",
      "description": "WebSocket URL through Nginx/Gateway",
      "enabled": true
    },
    {
      "key": "auth_token",
      "value": "",
      "description": "JWT token for authenticated requests",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "description": "Current user ID for testing",
      "enabled": true
    },
    {
      "key": "order_id",
      "value": "",
      "description": "Current order ID for testing",
      "enabled": true
    },
    {
      "key": "product_id",
      "value": "",
      "description": "Current product ID for testing",
      "enabled": true
    }
  ]
}
```

### Staging Environment
**Archivo**: `postman/environments/staging.postman_environment.json`

```json
{
  "id": "staging-env",
  "name": "Staging Environment",
  "values": [
    {
      "key": "base_url",
      "value": "https://api-staging.restaurant.com",
      "description": "Staging API Gateway URL"
    },
    {
      "key": "websocket_url",
      "value": "wss://api-staging.restaurant.com/ws",
      "description": "Staging WebSocket URL"
    },
    {
      "key": "auth_token",
      "value": "",
      "description": "JWT token for staging"
    }
  ]
}
```

---

## 🔐 Auth Requests - Pre/Post Scripts

### Login Admin
```
Method: POST
URL: {{base_url}}/api/admin/auth/login
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "email": "admin@sofka.com.co",
  "password": "encrypted_password_from_adminService.ts"
}
```

**Pre-request Script:**
```javascript
// Limpiar variables previas
pm.environment.set("auth_token", "");
pm.environment.set("user_id", "");

// Logging
console.log("🔐 Attempting admin login...");
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('success', true);
});

pm.test("Response has user data", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('user');
  pm.expect(jsonData.user).to.have.property('id');
});

pm.test("Cookies are set correctly", function () {
  pm.expect(pm.cookies.has('accessToken')).to.be.true;

  // Validar que la cookie tiene propiedades de seguridad
  const accessTokenCookie = pm.cookies.get('accessToken');
  pm.expect(accessTokenCookie.httpOnly).to.be.true; // Debería ser httpOnly
});

pm.test("Save auth token and user ID", function () {
  const jsonData = pm.response.json();

  // Guardar token para requests futuros
  if (jsonData.token) {
    pm.environment.set("auth_token", jsonData.token);
  }

  // Guardar user ID
  if (jsonData.user && jsonData.user.id) {
    pm.environment.set("user_id", jsonData.user.id);
  }
});

pm.test("Response time is acceptable", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000); // < 1 segundo
});

pm.test("Validate response schema", function () {
  const jsonData = pm.response.json();

  // Schema validation
  pm.expect(jsonData).to.have.property('success');
  pm.expect(jsonData).to.have.property('user');
  pm.expect(jsonData.user).to.have.property('id');
  pm.expect(jsonData.user).to.have.property('email');
  pm.expect(jsonData.user).to.have.property('name');
});
```

### Logout Admin
```
Method: POST
URL: {{base_url}}/api/admin/auth/logout
Headers:
  Content-Type: application/json
  Cookie: accessToken={{auth_token}}
```

**Pre-request Script:**
```javascript
// Verificar que tenemos token
if (!pm.environment.get("auth_token")) {
  pm.sendRequest({
    url: pm.variables.get("base_url") + "/api/admin/auth/login",
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        email: "admin@sofka.com.co",
        password: "encrypted_password"
      })
    }
  }, function (err, response) {
    if (!err && response.code === 200) {
      const token = response.json().token;
      pm.environment.set("auth_token", token);
    }
  });
}

console.log("🔓 Attempting admin logout...");
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('success', true);
});

pm.test("Cookie is cleared", function () {
  // Verificar que la cookie fue invalidada
  pm.expect(pm.cookies.has('accessToken')).to.be.false;
});

pm.test("Clean up environment variables", function () {
  pm.environment.set("auth_token", "");
  pm.environment.set("user_id", "");
});
```

---

## 📝 Orders Requests - CRUD Operations

### Create Order
```
Method: POST
URL: {{base_url}}/api/orders
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "table": "5",
  "customerName": "Test Customer",
  "items": [
    {
      "productName": "Test Pizza",
      "quantity": 2,
      "unitPrice": 15.99,
      "note": "Extra cheese"
    }
  ]
}
```

**Pre-request Script:**
```javascript
// No authentication required for order creation
console.log("📝 Creating test order...");
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Response has success field", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('success', true);
});

pm.test("Response has order data", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
  pm.expect(jsonData.data).to.have.property('id');
  pm.expect(jsonData.data).to.have.property('orderNumber');
});

pm.test("Save order ID for future tests", function () {
  const jsonData = pm.response.json();
  if (jsonData.data && jsonData.data.id) {
    pm.environment.set("order_id", jsonData.data.id);
  }
});

pm.test("Validate order schema", function () {
  const jsonData = pm.response.json();
  const order = jsonData.data;

  pm.expect(order).to.have.property('id');
  pm.expect(order).to.have.property('table');
  pm.expect(order).to.have.property('customerName');
  pm.expect(order).to.have.property('items');
  pm.expect(order.items).to.be.an('array');
  pm.expect(order.items.length).to.be.greaterThan(0);
});
```

### Get Order by ID
```
Method: GET
URL: {{base_url}}/api/orders/{{order_id}}
Headers:
  Content-Type: application/json
```

**Pre-request Script:**
```javascript
// Verificar que tenemos order_id
if (!pm.environment.get("order_id")) {
  // Crear orden si no existe
  pm.sendRequest({
    url: pm.variables.get("base_url") + "/api/orders",
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        "table": "5",
        "customerName": "Test Customer",
        "items": [{
          "productName": "Test Pizza",
          "quantity": 1,
          "unitPrice": 15.99
        }]
      })
    }
  }, function (err, response) {
    if (!err && response.code === 201) {
      const orderId = response.json().data.id;
      pm.environment.set("order_id", orderId);
    }
  });
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has order data", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
});

pm.test("Order matches expected structure", function () {
  const jsonData = pm.response.json();
  const order = jsonData.data;

  pm.expect(order.id).to.eql(pm.environment.get("order_id"));
  pm.expect(order).to.have.property('table');
  pm.expect(order).to.have.property('status');
});
```

### List Kitchen Orders
```
Method: GET
URL: {{base_url}}/api/kitchen/orders
Headers:
  Content-Type: application/json
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
  pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Orders have required fields", function () {
  const jsonData = pm.response.json();
  const orders = jsonData.data;

  if (orders.length > 0) {
    const order = orders[0];
    pm.expect(order).to.have.property('id');
    pm.expect(order).to.have.property('table');
    pm.expect(order).to.have.property('status');
    pm.expect(order).to.have.property('items');
  }
});
```

---

## 👨‍💼 Admin Requests - Authenticated Operations

### List Users
```
Method: GET
URL: {{base_url}}/api/admin/users
Headers:
  Content-Type: application/json
  Cookie: accessToken={{auth_token}}
```

**Pre-request Script:**
```javascript
// Verificar autenticación
if (!pm.environment.get("auth_token")) {
  throw new Error("❌ No auth token available. Run Login Admin first.");
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has data array", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
  pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Users have required fields", function () {
  const jsonData = pm.response.json();
  const users = jsonData.data;

  if (users.length > 0) {
    const user = users[0];
    pm.expect(user).to.have.property('id');
    pm.expect(user).to.have.property('email');
    pm.expect(user).to.have.property('name');
    pm.expect(user).to.have.property('roles');
  }
});
```

### Dashboard Metrics
```
Method: GET
URL: {{base_url}}/api/admin/dashboard/metrics
Headers:
  Content-Type: application/json
  Cookie: accessToken={{auth_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has metrics data", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
});

pm.test("Metrics have expected structure", function () {
  const jsonData = pm.response.json();
  const metrics = jsonData.data;

  // Validar estructura de métricas
  pm.expect(metrics).to.have.property('totalOrders');
  pm.expect(metrics).to.have.property('totalRevenue');
  pm.expect(metrics).to.have.property('activeUsers');

  // Validar tipos de datos
  pm.expect(metrics.totalOrders).to.be.a('number');
  pm.expect(metrics.totalRevenue).to.be.a('number');
  pm.expect(metrics.activeUsers).to.be.a('number');
});
```

---

## 🔌 WebSocket Testing

### WebSocket Health Check
```
Method: GET
URL: {{base_url}}/api/ws
Headers:
  Content-Type: application/json
```

**Nota:** Postman WebSocket testing es limitado. Este endpoint valida que el proxy WS esté accesible.

**Tests:**
```javascript
pm.test("WebSocket proxy is accessible", function () {
  // Este endpoint debería responder aunque no haga upgrade
  pm.response.to.have.status(200);
});

// Nota: Para testing completo de WebSocket events,
// usar testing manual o herramientas especializadas como WebSocket King
```

### Simulación de Eventos WebSocket
Para testing completo de WebSocket, crear un script Node.js separado:

**Archivo**: `test-websocket.js`
```javascript
const WebSocket = require('ws');

const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:3000/ws';

console.log('🔌 Testing WebSocket connection to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ WebSocket connected');

  // Simular envío de evento ORDER_READY
  const message = {
    type: 'ORDER_READY',
    id: 'test-order-id'
  };

  ws.send(JSON.stringify(message));
  console.log('📡 Sent ORDER_READY event');
});

ws.on('message', function incoming(data) {
  console.log('📨 Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket closed');
  process.exit(0);
});

// Timeout después de 10 segundos
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
}, 10000);
```

---

## 🚫 Edge Cases Testing

### Invalid Authentication
```
Method: GET
URL: {{base_url}}/api/admin/users
Headers:
  Content-Type: application/json
  Cookie: accessToken=invalid_token
```

**Tests:**
```javascript
pm.test("Status code is 401", function () {
  pm.response.to.have.status(401);
});

pm.test("Response indicates authentication failure", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('success', false);
  pm.expect(jsonData).to.have.property('message');
});
```

### Invalid Order Data
```
Method: POST
URL: {{base_url}}/api/orders
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "table": "",
  "customerName": "",
  "items": []
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
  pm.response.to.have.status(400);
});

pm.test("Response has validation errors", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('success', false);
  pm.expect(jsonData).to.have.property('errors');
});
```

---

## 🏥 Health Checks

### API Gateway Health
```
Method: GET
URL: {{base_url}}/health
Headers:
  Content-Type: application/json
```

**Tests:**
```javascript
pm.test("Gateway is healthy", function () {
  pm.response.to.have.status(200);
});

pm.test("Response indicates service health", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('status', 'healthy');
  pm.expect(jsonData).to.have.property('services');
});
```

---

## 🚀 Runner Configuration

### Full Test Suite Runner
```json
{
  "name": "API Gateway Centralization - Full Suite",
  "requests": [
    "Login Admin",
    "Create Order",
    "Get Order by ID",
    "List Kitchen Orders",
    "List Users",
    "Dashboard Metrics",
    "WebSocket Health Check",
    "Logout Admin",
    "Invalid Authentication",
    "Invalid Order Data"
  ],
  "environments": ["local"],
  "delay": 1000,
  "iterations": 1
}
```

### CI/CD Integration
```yaml
# .github/workflows/test-api.yml
name: Test API Gateway
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Newman
        run: npm install -g newman
      - name: Run Postman Tests
        run: newman run postman/collection.json -e postman/environments/local.json --reporters cli,json --reporter-json-export results.json
```

---

## 📋 Checklist de Aceptación

### ✅ Postman Collection
- [ ] Collection importable sin errores
- [ ] Environments configurados correctamente
- [ ] Variables de entorno funcionan
- [ ] Pre-request scripts ejecutan correctamente
- [ ] Tests assertions pasan
- [ ] Runner ejecuta suite completa

### ✅ Coverage de Testing
- [ ] Auth: Login, Logout, Invalid auth
- [ ] Orders: CRUD completo
- [ ] Admin: Users, Products, Dashboard
- [ ] WebSocket: Health check
- [ ] Edge cases: Validation errors
- [ ] Health checks: All services

### ✅ Automatización
- [ ] Tests corren automáticamente
- [ ] Results exportables a JSON
- [ ] CI/CD integration ready
- [ ] Reportes de cobertura generados

### ✅ Validación Arquitectural
- [ ] Todas las requests van por Gateway (:3000)
- [ ] WebSocket va por Nginx upgrade
- [ ] Autenticación funciona correctamente
- [ ] Schema validation funciona
- [ ] Performance acceptable (<1s responses)

---

## 📊 Métricas de Éxito

| Métrica | Valor Esperado | Cómo Medir |
|---------|----------------|------------|
| **Test success rate** | 100% | Newman CLI output |
| **Response time** | <1000ms | Postman response time |
| **Test coverage** | 95% | Manual count vs total endpoints |
| **CI/CD integration** | ✅ | GitHub Actions success |

---

## 📚 Referencias

### Archivos Creados
- `postman/collection.json` - Postman collection
- `postman/environments/local.json` - Local environment
- `postman/environments/staging.json` - Staging environment
- `test-websocket.js` - WebSocket testing script

### Herramientas
- **Postman/Newman**: API testing
- **WebSocket King**: WebSocket testing avanzado
- **Jest**: Unit tests complementarios

### Documentación Relacionada
- [API_GATEWAY_CENTRALIZATION_ANALYSIS.md](../API_GATEWAY_CENTRALIZATION_ANALYSIS.md) - Plan completo
- [README.md](../../README.md) - Guía de testing

---

## 📝 Log de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-01-02 | AI Assistant | Fase 4 creada con Postman testing completo |

---

**Fin de Fase 4**