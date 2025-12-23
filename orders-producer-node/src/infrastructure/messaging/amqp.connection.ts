
import * as amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

// ============================================================================
// INTERFACES (Dependency Inversion - D en SOLID)
// ============================================================================

/**
 * Logger contract - permite inyectar diferentes implementaciones
 */
export interface ILogger {
  log(message: string): void;
  error(message: string, error?: any): void;
  debug(message: string): void;
}

/**
 * AMQP Configuration contract
 */
export interface IAMQPConfig {
  protocol: string;
  hostname: string;
  port?: number;
  username: string;
  password: string;
  vhost?: string;
  locale?: string;
  frameMax?: number;
  heartbeat?: number;
}

/**
 * Connection provider - puede ser cloud o local
 */
export interface IConnectionProvider {
  getConfig(): IAMQPConfig;
  getConnectionType(): "cloud" | "local";
}

/**
 * Queue operations contract (Interface Segregation - I en SOLID)
 */
export interface IQueueManager {
  sendToQueue(queue: string, payload: Buffer, options?: amqp.Options.Publish): Promise<void>;
  assertQueue(queue: string, options?: any): Promise<void>;
}

/**
 * Channel manager contract
 */
export interface IChannelManager {
  getChannel(): Promise<amqp.Channel>;
  closeChannel(): Promise<void>;
}

/**
 * Connection lifecycle contract
 */
export interface IConnectionManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

// ============================================================================
// DEFAULT LOGGER IMPLEMENTATION
// ============================================================================

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string, error?: any): void {
    console.error(message, error);
  }

  debug(message: string): void {
    console.debug(message);
  }
}

// ============================================================================
// CONNECTION PROVIDERS (Factory Pattern - Open/Closed - O en SOLID)
// ============================================================================

class LocalConnectionProvider implements IConnectionProvider {
  getConfig(): IAMQPConfig {
    return {
      protocol: process.env.AMQP_LOCAL_PROTOCOL || "amqp",
      hostname: process.env.AMQP_LOCAL_HOST || "localhost",
      port: Number(process.env.AMQP_LOCAL_PORT) || undefined,
      username: process.env.AMQP_LOCAL_USER || "guest",
      password: process.env.AMQP_LOCAL_PASS || "guest",
      locale: "en_US",
      frameMax: 0,
      heartbeat: 0,
    };
  }

  getConnectionType(): "local" {
    return "local";
  }
}

class CloudConnectionProvider implements IConnectionProvider {
  getConfig(): IAMQPConfig {
    return {
      protocol: process.env.AMQP_CLOUD_PROTOCOL || "amqps",
      hostname: process.env.AMQP_CLOUD_HOST || "",
      port: Number(process.env.AMQP_CLOUD_PORT) || 5671,
      username: process.env.AMQP_CLOUD_USER || "",
      password: process.env.AMQP_CLOUD_PASS || "",
      vhost: process.env.AMQP_CLOUD_VHOST || "/",
    };
  }

  getConnectionType(): "cloud" {
    return "cloud";
  }
}

// ============================================================================
// CHANNEL MANAGER (Single Responsibility - S en SOLID)
// ============================================================================

class ChannelManager implements IChannelManager {
  private channel: amqp.Channel | null = null;
  private connection: amqp.Connection | null = null;

  constructor(private readonly logger: ILogger) {}

  setConnection(connection: amqp.Connection): void {
    this.connection = connection;
  }

  async getChannel(): Promise<amqp.Channel> {
    if (this.channel) return this.channel;

    if (!this.connection) {
      throw new Error("AMQP connection not established");
    }

    try {
      this.channel = await this.connection.createChannel();
      this.logger.log("📡 Canal AMQP listo");
      return this.channel;
    } catch (error) {
      this.logger.error("❌ Error creando canal AMQP:", error);
      throw error;
    }
  }

  async closeChannel(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
        this.channel = null;
        this.logger.log("✅ Canal AMQP cerrado");
      } catch (error) {
        this.logger.error("❌ Error cerrando canal AMQP:", error);
      }
    }
  }
}

// ============================================================================
// QUEUE MANAGER (Single Responsibility - S en SOLID)
// ============================================================================

class QueueManager implements IQueueManager {
  constructor(
    private readonly channelManager: IChannelManager,
    private readonly logger: ILogger,
  ) {}

  async sendToQueue(
    queue: string,
    payload: Buffer,
    options?: amqp.Options.Publish,
  ): Promise<void> {
    try {
      const channel = await this.channelManager.getChannel();
      await this.assertQueue(queue);
      channel.sendToQueue(queue, payload, options ?? { persistent: true });
      this.logger.debug(`✅ Mensaje enviado a cola: ${queue}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje a ${queue}:`, error);
      throw error;
    }
  }

  async assertQueue(queue: string, options?: any): Promise<void> {
    try {
      const channel = await this.channelManager.getChannel();
      await channel.assertQueue(queue, options ?? { durable: true });
    } catch (error) {
      this.logger.error(`❌ Error afirmando cola ${queue}:`, error);
      throw error;
    }
  }
}

// ============================================================================
// CONNECTION MANAGER (Single Responsibility + Open/Closed - S,O en SOLID)
// ============================================================================

class RabbitMQConnectionManager implements IConnectionManager {
  private connection: amqp.Connection | null = null;
  private isConnecting: boolean = false;

  constructor(
    private readonly provider: IConnectionProvider,
    private readonly channelManager: ChannelManager,
    private readonly logger: ILogger,
  ) {}

  async connect(): Promise<void> {
    if (this.connection) return;
    if (this.isConnecting) return; // Evitar conexiones concurrentes

    this.isConnecting = true;

    try {
      const config = this.provider.getConfig();
      const type = this.provider.getConnectionType();

      this.connection = await amqp.connect(config);

      this.logger.log(
        `🐇 Conexión ${type === "cloud" ? "CloudAMQP" : "Local AMQP"} creada`,
      );

      this.channelManager.setConnection(this.connection);

      // Configurar manejadores de eventos para reconexión
      this.connection.on("error", (error) => {
        this.logger.error("❌ Error en conexión AMQP:", error);
        this.connection = null;
      });

      this.connection.on("close", () => {
        this.logger.log("⚠️  Conexión AMQP cerrada");
        this.connection = null;
      });
    } catch (error) {
      this.logger.error("❌ Error creando conexión AMQP:", error);
      this.connection = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.channelManager.closeChannel();

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
        this.logger.log("✅ Conexión AMQP desconectada");
      }
    } catch (error) {
      this.logger.error("❌ Error desconectando AMQP:", error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }
}

// ============================================================================
// SINGLETON FACADE (Backwards compatibility + Clean API)
// ============================================================================

class RabbitMQConnection {
  private static instance: RabbitMQConnection | null = null;
  private connectionManager: RabbitMQConnectionManager | null = null;
  private queueManager: QueueManager | null = null;
  private readonly logger: ILogger;

  private constructor(logger?: ILogger) {
    this.logger = logger || new ConsoleLogger();
  }

  static getInstance(logger?: ILogger): RabbitMQConnection {
    RabbitMQConnection.instance ??= new RabbitMQConnection(logger);
    return RabbitMQConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.connectionManager) return;

    const connectionType = process.env.AMQP_CONNECTION_TYPE || "local";
    const provider =
      connectionType === "cloud"
        ? new CloudConnectionProvider()
        : new LocalConnectionProvider();

    const channelManager = new ChannelManager(this.logger);
    this.connectionManager = new RabbitMQConnectionManager(
      provider,
      channelManager,
      this.logger,
    );
    this.queueManager = new QueueManager(channelManager, this.logger);

    await this.connectionManager.connect();
  }

  async getChannel(): Promise<amqp.Channel> {
    if (!this.connectionManager) {
      await this.connect();
    }

    if (!this.connectionManager) {
      throw new Error("Failed to initialize AMQP connection");
    }

    const channelManager = this.connectionManager as any;
    return channelManager.channelManager.getChannel();
  }

  async sendToQueue(queue: string, payload: Buffer, opts?: amqp.Options.Publish): Promise<void> {
    if (!this.queueManager) {
      await this.connect();
    }

    if (!this.queueManager) {
      throw new Error("Failed to initialize queue manager");
    }

    await this.queueManager.sendToQueue(queue, payload, opts);
  }

  async disconnect(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.disconnect();
    }
  }

  // Testing helpers
  _resetChannelForTesting(): void {
    if (this.connectionManager) {
      const channelManager = (this.connectionManager as any).channelManager;
      channelManager.channel = null;
    }
  }

  _getConnectionManager() {
    return this.connectionManager;
  }
}

// ============================================================================
// SINGLETON INSTANCE & PUBLIC API (Backwards compatible)
// ============================================================================

const instance = RabbitMQConnection.getInstance();

export async function getChannel(): Promise<amqp.Channel> {
  return instance.getChannel();
}

export async function sendToDLQ(
  channel: amqp.Channel,
  queue: string,
  payload: Buffer,
): Promise<void> {
  try {
    // Preferir el canal pasado (usa la misma conexión)
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, payload, { persistent: true });
  } catch (err) {
    // Fallback al singleton (mejor esfuerzo)
    try {
      await instance.sendToQueue(queue, payload, { persistent: true });
    } catch (error_) {
      console.error("❌ failed to write to DLQ:", error_);
      throw error_;
    }
  }
}

// ============================================================================
// EXPORTS FOR TESTING & ADVANCED USE
// ============================================================================

export function _getInstanceForTesting() {
  return instance;
}

export async function _callConnectForTesting() {
  return instance.connect();
}

// Export managers for dependency injection (advanced use cases)
export {
  RabbitMQConnection,
  RabbitMQConnectionManager,
  QueueManager,
  ChannelManager,
  LocalConnectionProvider,
  CloudConnectionProvider,
  ConsoleLogger,
};
