# Fase 3: Limpieza y Documentación

**Fecha**: 2026-01-02
**Estado**: Lista para Implementación
**Duración Estimada**: 2-3 horas
**Riesgo**: BAJO
**Objetivo**: Limpiar variables obsoletas, actualizar documentación y validar consistencia completa

---

## 📋 Resumen Ejecutivo

### Problema
Después de las fases 1 y 2, quedan variables de entorno obsoletas, documentación desactualizada, y tests que necesitan actualización para reflejar la nueva arquitectura.

### Solución
Realizar limpieza completa del codebase, actualizar documentación, y validar que no queden URLs hardcoded o configuraciones inconsistentes.

### Beneficios
- ✅ Configuración limpia y consistente
- ✅ Documentación actualizada
- ✅ Tests que reflejan arquitectura real
- ✅ Mantenibilidad futura facilitada
- ✅ Variables de entorno minimalistas

---

## 📝 Cambios Requeridos

### 3.1 Docker Compose - Limpiar Variables Obsoletas

**Archivo**: `docker-compose.yml`

```yaml
# ANTES (❌ Variables obsoletas):
front:
  build:
    args:
      - VITE_API_GATEWAY_URL=http://localhost:3000
      - VITE_NODE_MS_URL=http://localhost:4000  # ❌ REMOVER - Ya no se usa

# DESPUÉS (✅ Limpio):
front:
  build:
    args:
      - VITE_API_GATEWAY_URL=http://localhost:3000
      - VITE_WEBSOCKET_URL=ws://localhost:3000/ws
```

### 3.2 README.md - Actualizar Variables de Entorno

**Archivo**: `README.md`

```markdown
## Variables de Entorno

### Frontend
- `VITE_API_GATEWAY_URL`: URL del API Gateway (default: http://localhost:3000)
- `VITE_WEBSOCKET_URL`: URL WebSocket a través de Nginx (default: ws://localhost:3000/ws)

### API Gateway
- `PORT`: Puerto del Gateway (default: 3000)
- `PYTHON_MS_URL`: URL del servicio Python (default: http://python-ms:8000)
- `NODE_MS_URL`: URL HTTP del servicio Node (default: http://node-ms:3002)
- `ADMIN_MS_URL`: URL del servicio Admin (default: http://admin-service:4001)

### Servicios Individuales
- `CLOUDAMQP_URL`: URL de RabbitMQ (para Python/Node services)
- `MONGO_URI`: URI de MongoDB (para Node/Admin services)
- `JWT_SECRET`: Secreto para JWT tokens
```

### 3.3 Tests - Actualizar para Nueva Arquitectura

**Archivo**: `orders-producer-frontend/src/test/useKitchenWebSocket.test.ts`

```typescript
// ANTES (❌ Tests viejos):
describe('getWebSocketUrl', () => {
  it('should use VITE_NODE_MS_URL when available', () => {
    import.meta.env.VITE_NODE_MS_URL = 'http://localhost:4000';
    const url = getWebSocketUrl();
    expect(url).toBe('ws://localhost:4000');
  });
});

// DESPUÉS (✅ Tests actualizados):
describe('getWebSocketUrl', () => {
  it('should use VITE_WEBSOCKET_URL when available', () => {
    import.meta.env.VITE_WEBSOCKET_URL = 'ws://localhost:3000/ws';
    const url = getWebSocketUrl();
    expect(url).toBe('ws://localhost:3000/ws');
  });

  it('should fallback to gateway WebSocket URL', () => {
    delete import.meta.env.VITE_WEBSOCKET_URL;
    const url = getWebSocketUrl();
    expect(url).toBe('ws://localhost:3000/ws');
  });
});
```

**Archivo**: `orders-producer-frontend/src/test/websocketService.test.ts`

```typescript
// Actualizar tests similares para websocketService
describe('WebSocketService', () => {
  it('should connect to correct WebSocket URL', () => {
    import.meta.env.VITE_WEBSOCKET_URL = 'ws://localhost:3000/ws';
    const service = new WebSocketService();
    expect(service['url']).toBe('ws://localhost:3000/ws');
  });
});
```

### 3.4 Validación - No URLs Hardcoded

**Comando de validación:**
```bash
# Buscar URLs hardcoded que podrían quedar
cd /workspace/sistema-de-pedidos-restaurante

# Frontend - No debería haber localhost:4001 ni localhost:4000 hardcoded
grep -r "localhost:4001\|localhost:4000" orders-producer-frontend/src/ --exclude-dir=node_modules

# Solo debería aparecer en tests o configuraciones permitidas
# ✅ Permitido: default.conf (Nginx proxy)
# ✅ Permitido: docker-compose.yml (variables de entorno)
# ✅ Permitido: tests que validan comportamiento
# ❌ NO PERMITIDO: Código fuente con URLs directas
```

### 3.5 Postman Collection - Documentar URLs Actualizadas

**Archivo**: `docs/testing/postman_collection.json` (o similar)

```json
{
  "info": {
    "name": "API Gateway Centralization",
    "description": "Testing suite for centralized API Gateway architecture",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "websocket_url",
      "value": "ws://localhost:3000/ws",
      "type": "string"
    }
  ]
}
```

---

## 🧪 Testing Strategy - Validación Completa

### 1. Testing Automatizado

#### Ejecutar Todos los Tests
```bash
# API Gateway
cd api-gateway
npm test

# Frontend
cd orders-producer-frontend
npm test

# Python Service
cd orders-producer-python
pytest

# Verificar cobertura
npm run test:coverage  # Si está configurado
```

#### Validar Builds
```bash
# API Gateway
cd api-gateway && npm run build

# Frontend
cd orders-producer-frontend && npm run build

# Verificar que no hay errores de TypeScript
npx tsc --noEmit  # TypeScript check
```

### 2. Testing con Postman - Suite Completa

#### Collection Estructura Final
```
📁 API Gateway Centralization v2.0
├── 📁 Environments
│   ├── 🔧 local.postman_environment.json
│   └── 🔧 staging.postman_environment.json
├── 📁 Auth
│   ├── 🔐 Login Admin (por Gateway)
│   └── 🔐 Logout Admin (por Gateway)
├── 📁 Orders
│   ├── 📝 Create Order (por Gateway)
│   ├── 📖 Get Order (por Gateway)
│   └── 📋 List Kitchen Orders (por Gateway)
├── 📁 Admin
│   ├── 👥 List Users (por Gateway)
│   ├── 🛍️ List Products (por Gateway)
│   ├── 📊 Dashboard Metrics (por Gateway)
│   └── 👤 User Management (por Gateway)
├── 📁 WebSocket
│   ├── 🔌 WebSocket Connection Test
│   ├── 📡 ORDER_NEW Event Simulation
│   └── 📡 ORDER_READY Event Simulation
└── 📁 Health Checks
    ├── 🏥 API Gateway Health
    ├── 🏥 Python Service Health
    ├── 🏥 Node Service Health
    └── 🏥 Admin Service Health
```

#### Runner Configuration
```json
{
  "name": "Full System Test Suite",
  "requests": [
    "Login Admin",
    "Create Order",
    "Get Order",
    "List Kitchen Orders",
    "WebSocket Connection Test",
    "Logout Admin"
  ],
  "variables": {
    "base_url": "http://localhost:3000",
    "websocket_url": "ws://localhost:3000/ws"
  }
}
```

### 3. Testing Manual - Checklist Completo

#### Validación Arquitectural
- [ ] **Todas las requests HTTP** van por Gateway (:3000)
- [ ] **WebSocket connections** van por Nginx → Gateway (:3000/ws)
- [ ] **No hay conexiones directas** a :4000 o :4001 desde frontend
- [ ] **Cookies funcionan** correctamente (mismo dominio)
- [ ] **CORS no es problema** (todo same-origin vía Nginx)

#### Validación Funcional
- [ ] Login funciona por Gateway
- [ ] Logout funciona por Gateway
- [ ] Creación de pedidos funciona
- [ ] Gestión de cocina funciona
- [ ] Dashboard funciona
- [ ] WebSocket events llegan correctamente
- [ ] Reconexión automática funciona

#### Validación Técnica
- [ ] Builds pasan sin errores
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] Postman collection completa pasa
- [ ] No hay memory leaks (1h testing)
- [ ] Logs son consistentes y útiles

---

## 🏃‍♂️ Pasos de Implementación

### Paso 1: Limpiar Variables de Entorno
```bash
# 1. Actualizar docker-compose.yml
# 2. Verificar sintaxis
docker compose config

# 3. Build test
docker compose build front
```

### Paso 2: Actualizar Documentación
```bash
# 1. Actualizar README.md
# 2. Verificar formato Markdown
# 3. Commit cambios
```

### Paso 3: Actualizar Tests
```bash
cd orders-producer-frontend

# 1. Actualizar tests de WebSocket
# 2. Ejecutar tests
npm test -- useKitchenWebSocket.test.ts

# 3. Verificar que pasan
```

### Paso 4: Validación Completa
```bash
# 1. Levantar sistema completo
docker compose up -d --build

# 2. Ejecutar Postman collection completa
# 3. Testing manual de funcionalidades
# 4. Verificar logs de todos los servicios

# 5. Validar no hay URLs hardcoded
grep -r "localhost:4001\|localhost:4000" orders-producer-frontend/src/ --exclude-dir=node_modules | grep -v "test\|spec"
# Debería retornar vacío (no hardcoded)
```

### Paso 5: Documentar Cambios
```bash
# 1. Actualizar CHANGELOG.md
# 2. Crear release notes
# 3. Actualizar documentación de arquitectura
```

---

## 📋 Checklist de Aceptación

### ✅ Limpieza de Código
- [ ] No hay variables de entorno obsoletas en docker-compose.yml
- [ ] No hay URLs hardcoded en código fuente (solo en configuración)
- [ ] Tests actualizados reflejan nueva arquitectura
- [ ] Imports y dependencias limpias

### ✅ Documentación
- [ ] README.md actualizado con variables correctas
- [ ] Documentación de arquitectura actualizada
- [ ] Postman collection documentada y versionada
- [ ] CHANGELOG.md actualizado

### ✅ Testing Completo
- [ ] Todos los tests unitarios pasan
- [ ] Postman collection completa pasa (100% success)
- [ ] Testing manual de todas las funcionalidades aprobado
- [ ] Builds pasan sin warnings/errors

### ✅ Validación Arquitectural
- [ ] Sistema funciona completamente por Gateway
- [ ] No hay bypasses de seguridad
- [ ] Logging centralizado funciona
- [ ] Performance aceptable (latencia <150ms para WS)

---

## 🚨 Plan de Rollback

Esta fase es principalmente limpieza, rollback mínimo:

```bash
# Si algo falla en documentación:
git checkout README.md

# Si tests fallan:
git checkout orders-producer-frontend/src/test/

# Rebuild si necesario:
docker compose up -d --build front
```

**Tiempo de rollback: < 2 minutos**

---

## 📊 Métricas de Éxito

| Métrica | Valor Esperado | Cómo Medir |
|---------|----------------|------------|
| **URLs hardcoded** | 0 | grep search en codebase |
| **Test success rate** | 100% | Jest + Postman results |
| **Build time** | < 5 min | CI/CD pipeline |
| **Documentation coverage** | 100% | README + ADR completos |

---

## 📚 Referencias

### Archivos Modificados
- `docker-compose.yml` - Variables de entorno limpias
- `README.md` - Documentación actualizada
- `orders-producer-frontend/src/test/useKitchenWebSocket.test.ts` - Tests actualizados
- `orders-producer-frontend/src/test/websocketService.test.ts` - Tests actualizados

### Archivos de Testing
- Postman Collection: `API Gateway Centralization v2.0`
- Test Results: `test-results/phase-3-validation.md`

### Documentación Relacionada
- [API_GATEWAY_CENTRALIZATION_ANALYSIS.md](../API_GATEWAY_CENTRALIZATION_ANALYSIS.md) - Plan completo
- [ARCHITECTURE_DIAGRAM.md](../ARCHITECTURE_DIAGRAM.md) - Diagrama actualizado
- [CHANGELOG.md](../CHANGELOG.md) - Historial de cambios

---

## 📝 Log de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-01-02 | AI Assistant | Fase 3 creada con limpieza completa y validación |

---

**Fin de Fase 3**