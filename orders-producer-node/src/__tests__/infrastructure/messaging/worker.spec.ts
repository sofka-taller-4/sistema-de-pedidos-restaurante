import * as amqp from "../../../infrastructure/messaging/amqp.connection";
import * as wsServer from "../../../infrastructure/websocket/ws-server";
import * as kitchenController from "../../../infrastructure/http/controllers/kitchen.controller";

// Mocks
jest.mock("../../../infrastructure/messaging/amqp.connection");
jest.mock("../../../infrastructure/websocket/ws-server");
jest.mock("../../../infrastructure/http/controllers/kitchen.controller");
jest.mock('ws');

const mockChannel = {
  assertQueue: jest.fn().mockResolvedValue({}),
  prefetch: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  sendToQueue: jest.fn().mockResolvedValue(undefined),
  checkQueue: jest.fn(),
};

const mockRepository = {
  getById: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  getAll: jest.fn().mockResolvedValue([]),
  updateStatus: jest.fn().mockResolvedValue(true),
};

describe("worker.ts - startWorker", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (amqp.getChannel as jest.Mock).mockResolvedValue(mockChannel);
    (amqp.sendToDLQ as jest.Mock).mockResolvedValue(undefined);
    (wsServer.notifyClients as jest.Mock).mockImplementation(() => {});
    (kitchenController.addKitchenOrder as jest.Mock).mockResolvedValue(undefined);
    (kitchenController.getRepository as jest.Mock).mockReturnValue(mockRepository);

    // Reset repository mocks
    mockRepository.getById.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(undefined);
    mockRepository.remove.mockResolvedValue(undefined);

    mockChannel.checkQueue.mockResolvedValue({ messageCount: 1 });
  });

  it("inicializa channel correctamente", async () => {
    const { startWorker } = await import("../../../infrastructure/messaging/worker");
    await startWorker();

    expect(amqp.getChannel).toHaveBeenCalled();
    expect(mockChannel.consume).toHaveBeenCalledWith(
      "orders.new",
      expect.any(Function),
      { noAck: false }
    );
  });

  it("procesa mensaje completo: agrega orden con estado pending", async () => {
    const { startWorker } = await import("../../../infrastructure/messaging/worker");
    const order = {
      id: "ORD-123",
      orderId: "ORD-123",
      items: [{ productName: "Pizza", quantity: 2 }],
      table: 5,
    };

    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const mockMessage = {
      content: Buffer.from(JSON.stringify(order)),
      properties: { correlationId: "corr-abc" },
    };

    await consumeCallback(mockMessage);

    expect(kitchenController.addKitchenOrder).toHaveBeenCalled();
    const calledOrder = (kitchenController.addKitchenOrder as jest.Mock).mock.calls[0][0];
    expect(calledOrder.status).toBe("pending");
    // Verificar que se llamó con el tipo correcto y que la orden incluye los campos esperados
    expect(wsServer.notifyClients).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORDER_NEW",
        order: expect.objectContaining({
          id: order.id,
          orderId: order.orderId,
          table: order.table,
          items: order.items,
        }),
      })
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
  });

  it("actualiza orden existente preservando el estado actual", async () => {
    const { startWorker } = await import("../../../infrastructure/messaging/worker");

    const existingOrder = {
      id: "ORD-UPDATE",
      customerName: "Cliente Original",
      items: [{ productName: "Pizza", quantity: 1, unitPrice: 10000 }],
      table: "5",
      status: "preparing",
      createdAt: "2025-01-01T10:00:00.000Z"
    };

    const updatedOrderMessage = {
      id: "ORD-UPDATE",
      customerName: "Cliente Actualizado",
      items: [{ productName: "Pizza", quantity: 2, unitPrice: 10000 }],
      table: "6",
    };

    // Mock getById para retornar orden existente
    mockRepository.getById.mockResolvedValue(existingOrder);

    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const mockMessage = {
      content: Buffer.from(JSON.stringify(updatedOrderMessage)),
      properties: { correlationId: "corr-update" },
    };

    await consumeCallback(mockMessage);

    // Verificar que se llamó a remove y create para actualizar
    expect(mockRepository.getById).toHaveBeenCalledWith("ORD-UPDATE");
    expect(mockRepository.remove).toHaveBeenCalledWith("ORD-UPDATE");
    expect(mockRepository.create).toHaveBeenCalled();

    // Verificar que se preservó el estado "preparing"
    const createdOrder = mockRepository.create.mock.calls[0][0];
    expect(createdOrder.status).toBe("preparing");
    expect(createdOrder.customerName).toBe("Cliente Actualizado");

    // Verificar notificación de actualización
    expect(wsServer.notifyClients).toHaveBeenCalledWith({
      type: "ORDER_UPDATED",
      order: expect.objectContaining({
        id: "ORD-UPDATE",
        status: "preparing"
      })
    });
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
  });

  it("envia a DLQ si addKitchenOrder falla", async () => {
    await jest.isolateModulesAsync(async () => {
      (kitchenController.addKitchenOrder as jest.Mock).mockRejectedValue(new Error("DB Error"));
      const { startWorker } = await import("../../../infrastructure/messaging/worker");

      await startWorker();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const orderDLQ = { id: "ORD-456", items: [{productName: "X", quantity: 1}]};
      const mockMessage = {
        content: Buffer.from(JSON.stringify(orderDLQ)),
        properties: { correlationId: "corr-xyz" },
      };

      await consumeCallback(mockMessage);
      await Promise.resolve();

      expect(amqp.sendToDLQ).toHaveBeenCalledWith(
        mockChannel,
        "orders.failed",
        expect.any(Buffer)
      );
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  it("envia a DLQ con correlationId del mensaje en caso de error", async () => {
    await jest.isolateModulesAsync(async () => {
      (kitchenController.addKitchenOrder as jest.Mock).mockRejectedValue(new Error("DB Error"));
      const { startWorker } = await import("../../../infrastructure/messaging/worker");

      await startWorker();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const orderCorr = { id: "ORD-789", items: [{productName: "Y", quantity: 1}]};
      const mockMessage = {
        content: Buffer.from(JSON.stringify(orderCorr)),
        properties: { correlationId: "original-correlation-id" },
      };

      await consumeCallback(mockMessage);
      await Promise.resolve();

      expect(amqp.sendToDLQ).toHaveBeenCalledWith(
        mockChannel,
        "orders.failed",
        expect.any(Buffer)
      );
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  it("envia a DLQ sin correlationId si no existe en caso de error", async () => {
    await jest.isolateModulesAsync(async () => {
      (kitchenController.addKitchenOrder as jest.Mock).mockRejectedValue(new Error("DB Error"));
      const { startWorker } = await import("../../../infrastructure/messaging/worker");

      await startWorker();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const orderNoCorr = { id: "ORD-NO-CORR", items: [{productName: "Z", quantity: 1}]};
      const mockMessage = {
        content: Buffer.from(JSON.stringify(orderNoCorr)),
        properties: {},
      };

      await consumeCallback(mockMessage);
      await Promise.resolve();

      expect(amqp.sendToDLQ).toHaveBeenCalledWith(
        mockChannel,
        "orders.failed",
        expect.any(Buffer)
      );
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  it("hace nack sin requeue si falla DLQ", async () => {
    await jest.isolateModulesAsync(async () => {
      (kitchenController.addKitchenOrder as jest.Mock).mockRejectedValue(new Error("DB Error"));
      (amqp.sendToDLQ as jest.Mock).mockRejectedValue(new Error("DLQ unavailable"));
      const { startWorker } = await import("../../../infrastructure/messaging/worker");

      await startWorker();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const orderFail = { id: "ORD-FAIL", items: [{productName: "A", quantity: 1}]};
      const mockMessage = {
        content: Buffer.from(JSON.stringify(orderFail)),
        properties: {},
      };

      await consumeCallback(mockMessage);
      await Promise.resolve();

      expect(amqp.sendToDLQ).toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  it("envia notificación cuando cola está vacía", async () => {
    mockChannel.checkQueue.mockResolvedValue({ messageCount: 0 });
    const { startWorker } = await import("../../../infrastructure/messaging/worker");

    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const order = { id: "ORD-EMPTY", items: [{ productName: "B", quantity: 1 }] };
    const mockMessage = {
      content: Buffer.from(JSON.stringify(order)),
      properties: {},
    };

    await consumeCallback(mockMessage);

    expect(wsServer.notifyClients).toHaveBeenCalledWith(
      expect.objectContaining({ type: "QUEUE_EMPTY" })
    );
  });

  it("no envía notificación de cola vacía si hay mensajes", async () => {
    mockChannel.checkQueue.mockResolvedValue({ messageCount: 5 });
    const { startWorker } = await import("../../../infrastructure/messaging/worker");

    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const order = { id: "ORD-NOT-EMPTY", items: [{ productName: "C", quantity: 1 }] };
    const mockMessage = {
      content: Buffer.from(JSON.stringify(order)),
      properties: {},
    };

    await consumeCallback(mockMessage);

    const queueEmptyCalls = (wsServer.notifyClients as jest.Mock).mock.calls.filter(
      (call) => call[0]?.type === "QUEUE_EMPTY"
    );
    expect(queueEmptyCalls.length).toBe(0);
  });

  it("maneja error durante procesamiento de orden", async () => {
    (kitchenController.addKitchenOrder as jest.Mock).mockRejectedValue(new Error("DB Error"));
    const { startWorker } = await import("../../../infrastructure/messaging/worker");

    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const orderError = { id: "ORD-ERROR", items: [{productName: "D", quantity: 1}]};
    const mockMessage = {
      content: Buffer.from(JSON.stringify(orderError)),
      properties: {},
    };

    await consumeCallback(mockMessage);

    expect(amqp.sendToDLQ).toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
  });

  it("parsea correctamente contenido del mensaje", async () => {
    const { startWorker } = await import("../../../infrastructure/messaging/worker");
    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const order = {
      id: "ORD-PARSE",
      items: [{ productName: "Tacos", quantity: 3 }],
      table: 7,
    };
    const mockMessage = {
      content: Buffer.from(JSON.stringify(order)),
      properties: {},
    };

    await consumeCallback(mockMessage);

    expect(kitchenController.addKitchenOrder).toHaveBeenCalled();
    // Verificar que se llamó con el tipo correcto y que la orden incluye los campos esperados
    expect(wsServer.notifyClients).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORDER_NEW",
        order: expect.objectContaining({
          id: order.id,
          table: order.table,
          items: order.items,
        }),
      })
    );
  });

  it("maneja error al inicializar el worker", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (amqp.getChannel as jest.Mock).mockRejectedValue(new Error("Channel initialization failed"));

    const { startWorker } = await import("../../../infrastructure/messaging/worker");
    await startWorker();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Error en el worker:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("maneja mensaje null sin procesar", async () => {
    const { startWorker } = await import("../../../infrastructure/messaging/worker");
    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];

    // Llamar con null (caso de cierre de canal/cancelación)
    await consumeCallback(null);

    // No debe llamar a ninguna función de procesamiento
    expect(kitchenController.addKitchenOrder).not.toHaveBeenCalled();
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });

  it("maneja error al parsear JSON cuando agrega correlationId a DLQ", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (kitchenController.addKitchenOrder as jest.Mock).mockRejectedValue(new Error("DB Error"));

    // Mockear JSON.parse para que falle solo en la segunda llamada
    const originalParse = JSON.parse;
    let parseCallCount = 0;
    const jsonParseSpy = jest.spyOn(JSON, "parse").mockImplementation((text: string) => {
      parseCallCount++;
      if (parseCallCount === 1) {
        // Primera llamada: parsear correctamente para extraer el id
        return originalParse(text);
      } else {
        // Segunda llamada (en el bloque de DLQ): lanzar error
        throw new SyntaxError("Unexpected error in JSON parse");
      }
    });

    const { startWorker } = await import("../../../infrastructure/messaging/worker");

    await startWorker();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];

    // Crear mensaje válido con correlationId
    const mockMessage = {
      content: Buffer.from(JSON.stringify({ id: "ORD-PARSE", items: [], total: 0 })),
      properties: {
        correlationId: "test-correlation-id"
      },
    };

    await consumeCallback(mockMessage);

    // Debe haber logueado el error del parse
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "⚠️ Error agregando correlationId a DLQ:",
      expect.any(Error)
    );
    // Aún así debe enviar a DLQ con el payload original
    expect(amqp.sendToDLQ).toHaveBeenCalledWith(
      mockChannel,
      "orders.failed",
      mockMessage.content  // Debe usar el contenido original, no modificado
    );
    expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);

    jsonParseSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});