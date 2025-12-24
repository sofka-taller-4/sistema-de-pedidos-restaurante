import type { Request, Response, NextFunction } from "express";

// Mock WebSocket module before importing controller
jest.mock("../../../../infrastructure/websocket/ws-server", () => ({
  notifyClients: jest.fn(),
  wss: {
    clients: new Set()
  }
}));

import { setOrderRepository, updateOrder } from "../../../../infrastructure/http/controllers/kitchen.controller";
import { KitchenOrder } from "../../../../domain/models/order";

describe("kitchen.controller - updateOrder", () => {
  let mockRepo: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      getById: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      getAll: jest.fn(),
      updateStatus: jest.fn(),
    };
    setOrderRepository(mockRepo);

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    req = {
      params: {},
      body: {},
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
    next = jest.fn();
  });

  it("actualiza orden exitosamente cuando está en estado pending", async () => {
    const existingOrder: KitchenOrder = {
      id: "ORD-123",
      customerName: "Cliente Original",
      items: [{ productName: "Pizza", quantity: 1, unitPrice: 10000 }],
      table: "5",
      status: "pending",
      createdAt: "2025-01-01T10:00:00.000Z",
    };

    req.params = { id: "ORD-123" };
    req.body = {
      customerName: "Cliente Actualizado",
      table: "10",
      items: [{ productName: "Hamburguesa", quantity: 2, unitPrice: 12000 }],
    };

    mockRepo.getById.mockResolvedValue(existingOrder);
    mockRepo.remove.mockResolvedValue(undefined);
    mockRepo.create.mockResolvedValue(undefined);

    await updateOrder(req as Request, res as Response, next);

    expect(mockRepo.getById).toHaveBeenCalledWith("ORD-123");
    expect(mockRepo.remove).toHaveBeenCalledWith("ORD-123");
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ORD-123",
        customerName: "Cliente Actualizado",
        table: "10",
        status: "pending",
      })
    );
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        customerName: "Cliente Actualizado",
        table: "10",
      }),
      message: "Order updated successfully",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 400 si falta el ID", async () => {
    req.params = {};
    req.body = { customerName: "Test" };

    await updateOrder(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "ID de orden requerido" });
    expect(mockRepo.getById).not.toHaveBeenCalled();
  });

  it("retorna 404 si la orden no existe", async () => {
    req.params = { id: "ORD-999" };
    req.body = { customerName: "Test" };
    mockRepo.getById.mockResolvedValue(null);

    await updateOrder(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Orden no encontrada" });
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it("retorna 409 si la orden no está en estado pending", async () => {
    const preparingOrder: KitchenOrder = {
      id: "ORD-123",
      customerName: "Cliente",
      items: [{ productName: "Pizza", quantity: 1, unitPrice: 10000 }],
      table: "5",
      status: "preparing",
      createdAt: "2025-01-01T10:00:00.000Z",
    };

    req.params = { id: "ORD-123" };
    req.body = { customerName: "Nuevo Cliente" };
    mockRepo.getById.mockResolvedValue(preparingOrder);

    await updateOrder(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "No se puede editar una orden que ya está en preparación",
    });
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it("actualiza orden parcialmente conservando campos no especificados", async () => {
    const existingOrder: KitchenOrder = {
      id: "ORD-456",
      customerName: "Cliente Original",
      items: [{ productName: "Pizza", quantity: 1, unitPrice: 10000 }],
      table: "5",
      status: "pending",
      createdAt: "2025-01-01T10:00:00.000Z",
    };

    req.params = { id: "ORD-456" };
    req.body = {
      customerName: "Nuevo Nombre",
      // No se especifica table ni items
    };

    mockRepo.getById.mockResolvedValue(existingOrder);

    await updateOrder(req as Request, res as Response, next);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ORD-456",
        customerName: "Nuevo Nombre",
        table: "5", // Se mantiene el original
        items: existingOrder.items, // Se mantienen los originales
      })
    );
  });

  it("conserva valores originales cuando se envían valores falsy", async () => {
    const existingOrder: KitchenOrder = {
      id: "ORD-789",
      customerName: "Cliente Original",
      items: [{ productName: "Pizza", quantity: 1, unitPrice: 10000 }],
      table: "5",
      status: "pending",
      createdAt: "2025-01-01T10:00:00.000Z",
    };

    req.params = { id: "ORD-789" };
    req.body = {
      customerName: "", // valor falsy
      table: null, // valor falsy
      items: undefined, // valor falsy
    };

    mockRepo.getById.mockResolvedValue(existingOrder);

    await updateOrder(req as Request, res as Response, next);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ORD-789",
        customerName: "Cliente Original", // Se mantiene el original
        table: "5", // Se mantiene el original
        items: existingOrder.items, // Se mantienen los originales
      })
    );
  });

  it("retorna 500 si el repository no está inicializado", async () => {
    setOrderRepository(null as any);
    req.params = { id: "ORD-123" };
    req.body = { customerName: "Test" };

    await updateOrder(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Repository no inicializado" });
  });

  it("llama a next con error si ocurre una excepción", async () => {
    const error = new Error("Database error");
    req.params = { id: "ORD-123" };
    req.body = { customerName: "Test" };
    mockRepo.getById.mockRejectedValue(error);

    await updateOrder(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(jsonMock).not.toHaveBeenCalled();
  });

  // ====================================================================
  // 🔴 FASE RED - TDD: Test para validación de tipo en customerName
  // ====================================================================
  it("retorna 400 si customerName no es un string (NoSQL Injection)", async () => {
    req.params = { id: "ORD-123" };
    req.body = {
      customerName: { $ne: null }, // ❌ Objeto malicioso en lugar de string
      table: "5",
    };

    await updateOrder(req as Request, res as Response, next);

    // Debe responder 400 Bad Request
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "customerName debe ser una cadena de texto",
    });

    // NO debe llamar al repositorio
    expect(mockRepo.getById).not.toHaveBeenCalled();
    expect(mockRepo.remove).not.toHaveBeenCalled();
    expect(mockRepo.create).not.toHaveBeenCalled();

    // NO debe notificar a clientes WebSocket
    const { notifyClients } = require("../../../../infrastructure/websocket/ws-server");
    expect(notifyClients).not.toHaveBeenCalled();
  });
  // ====================================================================
});
