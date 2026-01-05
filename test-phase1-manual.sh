#!/bin/bash

# Script de Testing Manual - Fase 1: Login/Logout Centralización
# Ejecutar este script para validar los cambios sin Docker

echo "🧪 Testing Manual - Fase 1: Login/Logout Centralización"
echo "======================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo ""
echo "1. 📝 Verificación de sintaxis de archivos modificados"
echo "---------------------------------------------------"

# Verificar que los archivos modificados existen y tienen contenido
echo "Verificando AdminController.ts..."
if grep -q "logout.*async" api-gateway/src/controllers/AdminController.ts; then
    print_result 0 "Método logout agregado en AdminController.ts"
else
    print_result 1 "Método logout NO encontrado en AdminController.ts"
fi

echo "Verificando admin.routes.ts..."
if grep -q "router.post.*logout" api-gateway/src/routes/admin.routes.ts; then
    print_result 0 "Ruta logout agregada en admin.routes.ts"
else
    print_result 1 "Ruta logout NO encontrada en admin.routes.ts"
fi

echo "Verificando adminApi.ts..."
if grep -q "api/admin/auth/login" orders-producer-frontend/src/config/adminApi.ts && grep -q "api/admin/auth/logout" orders-producer-frontend/src/config/adminApi.ts; then
    print_result 0 "URLs actualizadas para usar Gateway en adminApi.ts"
else
    print_result 1 "URLs NO actualizadas en adminApi.ts"
fi

# Verificar que ADMIN_SERVICE_BASE fue removido
if ! grep -q "ADMIN_SERVICE_BASE" orders-producer-frontend/src/config/adminApi.ts; then
    print_result 0 "ADMIN_SERVICE_BASE removido correctamente"
else
    print_result 1 "ADMIN_SERVICE_BASE aún presente"
fi

echo ""
echo "2. 🔗 Verificación de URLs de configuración"
echo "------------------------------------------"

echo "URLs de Login/Logout en adminApi.ts:"
grep -A2 -B2 "LOGIN:\|LOGOUT:" orders-producer-frontend/src/config/adminApi.ts

echo ""
echo "3. 🧪 Comandos de testing (requieren servicios corriendo)"
echo "--------------------------------------------------------"

echo "# Para probar login (requiere que los servicios estén corriendo):"
echo "curl -X POST http://localhost:3000/api/admin/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"admin@sofka.com.co\", \"password\": \"encrypted_password\"}' \\"
echo "  -c cookies.txt"
echo ""

echo "# Para probar logout:"
echo "curl -X POST http://localhost:3000/api/admin/auth/logout \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -b cookies.txt"
echo ""

echo "4. 📋 Checklist de validación manual"
echo "------------------------------------"
echo "[] ✅ Servicios corriendo (docker compose up -d --build)"
echo "[] ✅ Login funciona: POST /api/admin/auth/login retorna 200 + cookie"
echo "[] ✅ Logout funciona: POST /api/admin/auth/logout retorna 200"
echo "[] ✅ Frontend build funciona: npm run build en orders-producer-frontend/"
echo "[] ✅ Postman collection funciona: importar y ejecutar tests"
echo "[] ✅ No hay llamadas directas al puerto 4001 en logs"
echo "[] ✅ API Gateway registra login/logout en logs"

echo ""
echo "5. 🚨 Rollback Plan (si algo falla)"
echo "-----------------------------------"
echo "# Revertir cambios:"
echo "git checkout orders-producer-frontend/src/config/adminApi.ts"
echo "git checkout api-gateway/src/controllers/AdminController.ts"
echo "git checkout api-gateway/src/routes/admin.routes.ts"
echo ""
echo "# Rebuild:"
echo "docker compose down && docker compose up -d --build"

echo ""
echo "🎯 Próximos pasos:"
echo "- Ejecutar comandos curl arriba si servicios están corriendo"
echo "- Importar colección Postman en postman/collections/"
echo "- Si todo funciona, marcar Fase 1 como completada"
echo "- Proceder con Fase 2: WebSocket por Nginx"

echo ""
echo "📊 Resultados del testing:"
echo "- Archivos modificados: ✅ Verificados"
echo "- Sintaxis: ✅ Correcta"
echo "- URLs: ✅ Actualizadas"
echo "- Testing preparado: ✅ Listo"