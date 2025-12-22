// Configuración global para tests
// Mock de variables de entorno para evitar errores
process.env.PYTHON_MS_URL = 'http://localhost:8000';
process.env.NODE_MS_URL = 'http://localhost:3002';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'error'; // Reducir logs durante tests
process.env.REQUEST_TIMEOUT = '5000';
process.env.RETRY_ATTEMPTS = '3';

// Mock console methods to avoid cluttering test output
// Store original methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly needed
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

// Restore original console methods after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
