// Setup global para pruebas - configura variables de entorno necesarias
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

// Configuración para mongodb-memory-server
