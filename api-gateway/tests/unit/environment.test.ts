describe('Environment Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Set required variables by default
    process.env.PYTHON_MS_URL = 'http://python-service:5000';
    process.env.NODE_MS_URL = 'http://node-service:3000';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    jest.resetModules();
  });

  it('should throw error when PYTHON_MS_URL is missing', () => {
    delete process.env.PYTHON_MS_URL;

    expect(() => {
      require('../../src/config/environment');
    }).toThrow('Faltan variables requeridas: PYTHON_MS_URL');
  });

  it('should throw error when NODE_MS_URL is missing', () => {
    delete process.env.NODE_MS_URL;

    expect(() => {
      require('../../src/config/environment');
    }).toThrow('Faltan variables requeridas: NODE_MS_URL');
  });

  it('should throw error when both required variables are missing', () => {
    delete process.env.PYTHON_MS_URL;
    delete process.env.NODE_MS_URL;

    expect(() => {
      require('../../src/config/environment');
    }).toThrow('Faltan variables requeridas: PYTHON_MS_URL, NODE_MS_URL');
  });

  it('should load environment with required variables only', () => {
    delete process.env.PORT;
    delete process.env.REQUEST_TIMEOUT;
    delete process.env.RETRY_ATTEMPTS;
    delete process.env.ADMIN_MS_URL;
    delete process.env.JWT_SECRET;

    const { env } = require('../../src/config/environment');

    expect(env.PYTHON_MS_URL).toBe('http://python-service:5000');
    expect(env.NODE_MS_URL).toBe('http://node-service:3000');
    expect(env.PORT).toBe(8080);
    expect(env.REQUEST_TIMEOUT).toBe(30000);
    expect(env.RETRY_ATTEMPTS).toBe(3);
    expect(env.ADMIN_MS_URL).toBeUndefined();
    expect(env.JWT_SECRET).toBeUndefined();
  });

  it('should load environment with all variables defined', () => {
    process.env.PORT = '9000';
    process.env.ADMIN_MS_URL = 'http://admin-service:4000';
    process.env.REQUEST_TIMEOUT = '60000';
    process.env.RETRY_ATTEMPTS = '5';
    process.env.JWT_SECRET = 'my-secret-key';

    const { env } = require('../../src/config/environment');

    expect(env.PORT).toBe(9000);
    expect(env.PYTHON_MS_URL).toBe('http://python-service:5000');
    expect(env.NODE_MS_URL).toBe('http://node-service:3000');
    expect(env.ADMIN_MS_URL).toBe('http://admin-service:4000');
    expect(env.REQUEST_TIMEOUT).toBe(60000);
    expect(env.RETRY_ATTEMPTS).toBe(5);
    expect(env.JWT_SECRET).toBe('my-secret-key');
  });

  it('should use default PORT when not defined', () => {
    delete process.env.PORT;

    const { env } = require('../../src/config/environment');

    expect(env.PORT).toBe(8080);
  });

  it('should use default REQUEST_TIMEOUT when not defined', () => {
    delete process.env.REQUEST_TIMEOUT;

    const { env } = require('../../src/config/environment');

    expect(env.REQUEST_TIMEOUT).toBe(30000);
  });

  it('should use default RETRY_ATTEMPTS when not defined', () => {
    delete process.env.RETRY_ATTEMPTS;

    const { env } = require('../../src/config/environment');

    expect(env.RETRY_ATTEMPTS).toBe(3);
  });

  it('should parse PORT as integer', () => {
    process.env.PORT = '3000';

    const { env } = require('../../src/config/environment');

    expect(env.PORT).toBe(3000);
    expect(typeof env.PORT).toBe('number');
  });

  it('should parse REQUEST_TIMEOUT as integer', () => {
    process.env.REQUEST_TIMEOUT = '45000';

    const { env } = require('../../src/config/environment');

    expect(env.REQUEST_TIMEOUT).toBe(45000);
    expect(typeof env.REQUEST_TIMEOUT).toBe('number');
  });

  it('should parse RETRY_ATTEMPTS as integer', () => {
    process.env.RETRY_ATTEMPTS = '10';

    const { env } = require('../../src/config/environment');

    expect(env.RETRY_ATTEMPTS).toBe(10);
    expect(typeof env.RETRY_ATTEMPTS).toBe('number');
  });

  it('should use default values for all numeric fields', () => {
    delete process.env.PORT;
    delete process.env.REQUEST_TIMEOUT;
    delete process.env.RETRY_ATTEMPTS;

    const { env } = require('../../src/config/environment');

    expect(env.PORT).toBe(8080);
    expect(env.REQUEST_TIMEOUT).toBe(30000);
    expect(env.RETRY_ATTEMPTS).toBe(3);
  });

  it('should handle empty string for PORT', () => {
    process.env.PORT = '';

    const { env } = require('../../src/config/environment');

    expect(env.PORT).toBe(8080);
  });

  it('should handle empty string for REQUEST_TIMEOUT', () => {
    process.env.REQUEST_TIMEOUT = '';

    const { env } = require('../../src/config/environment');

    expect(env.REQUEST_TIMEOUT).toBe(30000);
  });

  it('should handle empty string for RETRY_ATTEMPTS', () => {
    process.env.RETRY_ATTEMPTS = '';

    const { env } = require('../../src/config/environment');

    expect(env.RETRY_ATTEMPTS).toBe(3);
  });
});
