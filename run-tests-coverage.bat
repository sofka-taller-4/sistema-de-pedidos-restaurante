@echo off
REM Script para ejecutar todos los tests y generar reportes de coverage
REM para análisis de SonarQube en Windows

echo ==========================================
echo Ejecutando Tests y Generando Coverage
echo ==========================================
echo.

REM 1. Frontend (React + TypeScript)
echo [STEP] Testing orders-producer-frontend...
cd orders-producer-frontend
call npm ci
call npm run test:coverage
echo [SUCCESS] Frontend coverage generated at: orders-producer-frontend/coverage/lcov.info
cd ..
echo.

REM 2. API Gateway (Node + TypeScript)
echo [STEP] Testing api-gateway...
cd api-gateway
call npm ci
call npm run test:coverage
echo [SUCCESS] API Gateway coverage generated at: api-gateway/coverage/lcov.info
cd ..
echo.

REM 3. Orders Producer Node (Node + TypeScript)
echo [STEP] Testing orders-producer-node...
cd orders-producer-node
call npm ci
call npm run test:coverage
echo [SUCCESS] Orders Producer Node coverage generated at: orders-producer-node/coverage/lcov.info
cd ..
echo.

REM 4. Orders Producer Python (FastAPI + Python)
echo [STEP] Testing orders-producer-python...
cd orders-producer-python
pip install -r requirements.txt
pytest
echo [SUCCESS] Orders Producer Python coverage generated at: orders-producer-python/coverage.xml
cd ..
echo.

REM Verificar archivos
echo ==========================================
echo Verificando archivos de coverage...
echo ==========================================

set MISSING_FILES=0

if exist "orders-producer-frontend\coverage\lcov.info" (
    echo [SUCCESS] orders-producer-frontend\coverage\lcov.info
) else (
    echo [ERROR] orders-producer-frontend\coverage\lcov.info NOT FOUND
    set /a MISSING_FILES+=1
)

if exist "api-gateway\coverage\lcov.info" (
    echo [SUCCESS] api-gateway\coverage\lcov.info
) else (
    echo [ERROR] api-gateway\coverage\lcov.info NOT FOUND
    set /a MISSING_FILES+=1
)

if exist "orders-producer-node\coverage\lcov.info" (
    echo [SUCCESS] orders-producer-node\coverage\lcov.info
) else (
    echo [ERROR] orders-producer-node\coverage\lcov.info NOT FOUND
    set /a MISSING_FILES+=1
)

if exist "orders-producer-python\coverage.xml" (
    echo [SUCCESS] orders-producer-python\coverage.xml
) else (
    echo [ERROR] orders-producer-python\coverage.xml NOT FOUND
    set /a MISSING_FILES+=1
)

echo.

if %MISSING_FILES%==0 (
    echo ==========================================
    echo [SUCCESS] All coverage reports generated successfully!
    echo ==========================================
    echo.
    echo Next steps:
    echo 1. Review coverage reports in each service's coverage directory
    echo 2. Run SonarQube analysis: sonar-scanner
    echo.
) else (
    echo ==========================================
    echo [ERROR] %MISSING_FILES% coverage report(s) missing!
    echo ==========================================
    exit /b 1
)
