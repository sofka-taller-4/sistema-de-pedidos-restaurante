# AGENTS.md - Guía para Agentes de Código

## Visión General
Sistema distribuido de gestión de pedidos de restaurante con arquitectura de microservicios:
- **Frontend**: React + TypeScript + Vite (puerto 5173)
- **API Gateway**: Express + TypeScript (puerto 3000) - Punto de entrada central
- **Servicio Python**: FastAPI (puerto 8000) - Validación de pedidos y publicación en RabbitMQ
- **Servicio Node**: Node.js + TypeScript (puertos 3002 HTTP, 4000 WebSocket) - Procesamiento de pedidos de cocina
- **Servicio Admin**: Node.js + MongoDB (puerto 4001) - Gestión de usuarios/productos/roles
- **RabbitMQ**: Message broker (puertos 5672, 15672)
- **MongoDB**: Base de datos (puerto 27017)

## Comandos de Build, Lint y Test

### Sistema Completo
```bash
# Iniciar todos los servicios con Docker
docker compose up -d --build

# Detener todos los servicios
docker compose down
```

### API Gateway (api-gateway/)
```bash
npm run dev              # Modo desarrollo
npm run build            # Compilar TypeScript
npm test                 # Ejecutar todos los tests
npm run test:watch       # Modo watch
npm run test:coverage    # Reporte de cobertura

# Ejecutar un solo archivo de test
npx jest tests/integration/auth.routes.test.ts
npx jest -t "patrón de nombre del test"  # Ejecutar test específico por nombre
```

### Orders Producer Node (orders-producer-node/)
```bash
npm run dev              # Modo desarrollo
npm run build            # Compilar TypeScript
npm test                 # Ejecutar todos los tests con cobertura
npm run test:watch       # Modo watch
npm run seed:products    # Poblar productos en MongoDB

# Ejecutar un solo archivo de test
npx jest src/__tests__/domain/factories/order.factory.spec.ts
```

### Admin Service (admin-service/)
```bash
npm run dev              # Modo desarrollo con auto-reload
npm run build            # Compilar TypeScript
npm test                 # Ejecutar todos los tests con cobertura
npm run test:watch       # Modo watch

# Ejecutar un solo archivo de test
npx jest src/__tests__/path/to/file.test.ts
```

### Frontend (orders-producer-frontend/)
```bash
npm run dev              # Modo desarrollo (puerto 5173)
npm run build            # Build de producción
npm run lint             # Ejecutar ESLint
npm test                 # Ejecutar Vitest
npm run test:ui          # Vitest UI
npm run test:coverage    # Reporte de cobertura

# Ejecutar un solo archivo de test
npx vitest src/test/KitchenOrderCard.test.tsx
npx vitest run --reporter=verbose  # Ejecutar todos los tests una vez
```

### Servicio Python (orders-producer-python/)
```bash
# Dentro de Docker o con entorno virtual
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest                   # Ejecutar todos los tests
pytest -v                # Salida verbose
pytest app/test_order_service.py  # Ejecutar un solo archivo de test
```

## Guías de Estilo de Código

### Servicios TypeScript/Node (API Gateway, Servicio Node, Servicio Admin)

**Imports**
- Agrupar imports: librerías externas → módulos internos → types/interfaces
- Usar rutas absolutas con alias `@/` donde esté configurado
- Orden: React/Express → third-party → servicios locales → utils → tipos

**Formato**
- Indentación: 2 espacios
- Punto y coma: Requerido
- Comillas: Comillas simples para strings
- Longitud de línea: ~100 caracteres (no estricto)
- Comas finales: En arrays/objetos multilínea

**Tipos**
- Usar modo `strict` de TypeScript
- Tipos de retorno explícitos para funciones
- Preferir interfaces sobre types para formas de objetos
- Usar `unknown` en lugar de `any` cuando sea posible, pero `any` es aceptable para manejo de errores
- Definir interfaces en archivos separados o al inicio del archivo

**Convenciones de Nombres**
- Clases: PascalCase (`OrdersController`, `ProxyService`)
- Interfaces: PascalCase con prefijo `I` (`IErrorHandler`, `IUserService`)
- Funciones/Variables: camelCase (`createOrder`, `proxyService`)
- Constantes: UPPER_SNAKE_CASE (`HTTP_STATUS`, `JWT_SECRET`)
- Archivos: kebab-case para utilidades, PascalCase para clases (`error-handler.ts`, `OrdersController.ts`)
- Archivos de test: `.test.ts` (integración/unitarios), `.spec.ts` (servicio Node)

**Manejo de Errores**
- Usar try-catch en funciones async
- Pasar errores al middleware `next()` de Express
- Patrón Chain of Responsibility para manejadores de errores (ver `api-gateway/src/handlers/`)
- Los manejadores de errores personalizados deben implementar la interfaz `IErrorHandler`
- Registrar errores con emojis descriptivos: ❌ para errores, ✅ para éxito, 📝 para info

**Async/Await**
- Preferir async/await sobre promesas
- Siempre manejar rechazos de promesas
- Usar `Promise.all()` para operaciones paralelas

### React/Frontend (orders-producer-frontend/)

**Componentes**
- Componentes funcionales con hooks
- Usar TypeScript para props
- Archivos de componentes: PascalCase (ej., `KitchenOrderCard.tsx`)
- Interfaz de props: `{ComponentName}Props`

**Gestión de Estado**
- Zustand para estado global
- React hooks para estado local
- Hooks personalizados: patrón `use{Name}` (ej., `useOrderManagement`)

**Testing**
- Vitest + Testing Library
- Ubicación de archivos de test: `src/test/{ComponentName}.test.tsx`
- Funciones mock con `vi.fn()`
- Usar `screen.getByText()`, `screen.getByRole()` para consultas
- Seguir patrón AAA: Arrange, Act, Assert

### Servicio Python (orders-producer-python/)

**Estilo**
- Cumplir con PEP 8
- Type hints para firmas de funciones
- Modelos Pydantic para validación
- Snake_case para funciones/variables

## Mejores Prácticas de Testing

### Principios FIRST
- **Fast** (Rápidos): Los tests se ejecutan rápidamente
- **Independent** (Independientes): Sin dependencias entre tests
- **Repeatable** (Repetibles): Resultados consistentes
- **Self-validating** (Auto-validables): Pasan/fallan claramente
- **Timely** (Oportunos): Escritos con/antes del código

### Patrones Jest/Vitest
```typescript
describe('Componente/Funcionalidad', () => {
  beforeEach(() => {
    jest.clearAllMocks();  // o vi.clearAllMocks()
  });

  it('debería hacer algo específico', () => {
    // Arrange (Preparar)
    const mockData = { id: '123' };
    
    // Act (Actuar)
    const result = functionUnderTest(mockData);
    
    // Assert (Verificar)
    expect(result).toBe(expected);
  });
});
```

## Reglas Críticas del Proyecto

**NO HACER:**
- ❌ Modificar la estrategia de persistencia sin consultar (Python usa in-memory, Node usa MongoDB)
- ❌ Omitir el API Gateway para llamadas externas (siempre enrutar a través del gateway)
- ❌ Crear/modificar código sin solicitud explícita del usuario
- ❌ Hacer suposiciones sobre requisitos - siempre clarificar

**HACER:**
- ✅ Usar API Gateway para toda comunicación frontend-backend
- ✅ Seguir nombres de eventos WebSocket: `ORDER_NEW`, `ORDER_READY`, `ORDER_UPDATED`, `QUEUE_EMPTY`
- ✅ Usar autenticación JWT para endpoints admin (`Authorization: Bearer <token>`)
- ✅ Validar entrada con Pydantic (Python) o Zod (Node/Gateway)
- ✅ Aplicar express-mongo-sanitize para prevención de inyección NoSQL
- ✅ Explicar acciones antes de ejecutar, pedir aclaraciones cuando no esté claro

## Puntos Clave de Integración
- **Cola RabbitMQ**: `orders.new` para todos los eventos de pedidos
- **Base de Datos MongoDB**: `orders_db` (compartida entre servicios Node y Admin)
- **Puerto WebSocket**: 4000 para actualizaciones de cocina en tiempo real
- **API Gateway**: Puerto 3000 - proxy a todos los servicios backend

## Variables de Entorno
Cada servicio requiere archivo `.env`. Ver READMEs individuales de cada servicio para variables requeridas. Comunes:
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `MONGO_URI`
- `CLOUDAMQP_URL`
- `CORS_ORIGIN`

## Patrones de Arquitectura
- **Chain of Responsibility**: Manejadores de errores en API Gateway
- **Strategy Pattern**: Cálculo de tiempo de preparación en servicio Node
- **Factory Pattern**: Creación de pedidos en servicio Node
- **Repository Pattern**: Abstracción de acceso a base de datos
- **Proxy Pattern**: Reenvío de servicios en API Gateway

## Referencias de Documentación
- `QA_REQUERIMIENTOS.md` - Requisitos de calidad y casos de test
- `SECURITY_AUDIT_AND_IMPROVEMENT_PLAN.md` - Guías de seguridad
- `README.md` - Visión general del sistema y configuración
- READMEs específicos de cada servicio en cada subdirectorio
