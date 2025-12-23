import dotenv from 'dotenv';

dotenv.config(); // Lee el archivo .env

// Define el contrato de las variables de entorno
interface Environment {
  PORT: number;              // Puerto donde corre el gateway
  PYTHON_MS_URL: string;     // URL del microservicio Python
  NODE_MS_URL: string;       // URL del microservicio Node
  ADMIN_MS_URL?: string;     // URL del microservicio Admin (opcional)
  REQUEST_TIMEOUT: number;   // Timeout de peticiones HTTP
  RETRY_ATTEMPTS: number;    // Cantidad de reintentos
  JWT_SECRET?: string;       // Clave para validar JWT (también se puede leer directo de process.env)
}

// Valida que todas las variables obligatorias existan al iniciar
class EnvironmentValidator {
  validate(): Environment {
    const required = ['PYTHON_MS_URL', 'NODE_MS_URL'];
    const missing = required.filter((key) => !process.env[key]);

    // Si falta alguna variable, el sistema NO inicia
    if (missing.length > 0) {
      throw new Error(`Faltan variables requeridas: ${missing.join(', ')}`);
    }

    // Retorna las variables con valores por defecto si no están definidas
    return {
      PORT: Number.parseInt(process.env.PORT || '8080', 10),
      PYTHON_MS_URL: process.env.PYTHON_MS_URL!,
      NODE_MS_URL: process.env.NODE_MS_URL!,
      ADMIN_MS_URL: process.env.ADMIN_MS_URL,
      REQUEST_TIMEOUT: Number.parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
      RETRY_ATTEMPTS: Number.parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
      JWT_SECRET: process.env.JWT_SECRET,
    };
  }
}

export const env = new EnvironmentValidator().validate();