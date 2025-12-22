#!/bin/bash

# Script para ejecutar todos los tests y generar reportes de coverage
# para análisis de SonarQube

set -e  # Salir si algún comando falla

echo "=========================================="
echo "Ejecutando Tests y Generando Coverage"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

show_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

show_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Frontend (React + TypeScript)
show_step "Testing orders-producer-frontend..."
cd orders-producer-frontend
npm ci
npm run test:coverage
show_success "Frontend coverage generated at: orders-producer-frontend/coverage/lcov.info"
cd ..
echo ""

# 2. API Gateway (Node + TypeScript)
show_step "Testing api-gateway..."
cd api-gateway
npm ci
npm run test:coverage
show_success "API Gateway coverage generated at: api-gateway/coverage/lcov.info"
cd ..
echo ""

# 3. Orders Producer Node (Node + TypeScript)
show_step "Testing orders-producer-node..."
cd orders-producer-node
npm ci
npm run test:coverage
show_success "Orders Producer Node coverage generated at: orders-producer-node/coverage/lcov.info"
cd ..
echo ""

# 4. Orders Producer Python (FastAPI + Python)
show_step "Testing orders-producer-python..."
cd orders-producer-python

# Verificar si existe un entorno virtual, si no, usar pip global
if [ ! -d "venv" ]; then
    show_step "Installing Python dependencies..."
    pip install -r requirements.txt
else
    show_step "Using existing virtual environment..."
    source venv/bin/activate
    pip install -r requirements.txt
fi

pytest
show_success "Orders Producer Python coverage generated at: orders-producer-python/coverage.xml"
cd ..
echo ""

# Verificar que todos los archivos de coverage se hayan generado
echo "=========================================="
echo "Verificando archivos de coverage..."
echo "=========================================="

MISSING_FILES=0

check_file() {
    if [ -f "$1" ]; then
        show_success "✓ $1"
    else
        show_error "✗ $1 NOT FOUND"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
}

check_file "orders-producer-frontend/coverage/lcov.info"
check_file "api-gateway/coverage/lcov.info"
check_file "orders-producer-node/coverage/lcov.info"
check_file "orders-producer-python/coverage.xml"

echo ""

if [ $MISSING_FILES -eq 0 ]; then
    echo "=========================================="
    show_success "All coverage reports generated successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Review coverage reports in each service's coverage directory"
    echo "2. Run SonarQube analysis: sonar-scanner"
    echo ""
else
    echo "=========================================="
    show_error "$MISSING_FILES coverage report(s) missing!"
    echo "=========================================="
    exit 1
fi
