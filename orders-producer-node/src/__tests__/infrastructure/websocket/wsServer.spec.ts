import { WebSocket } from "ws";
import { Server } from "http";

// Mock clients set
const mockClients = new Set();

// Mock ws module ANTES de importar wsServer
jest.mock("ws", () => {
  return {
    WebSocketServer: jest.fn().mockImplementation(() => ({
      clients: mockClients,
      on: jest.fn(),
    })),
    WebSocket: {
      OPEN: 1,
      CLOSED: 3,
    },
  };
});

import { notifyClients, initializeWebSocket } from "../../../infrastructure/websocket/ws-server";

describe("wsServer", () => {
  const mockClient1 = {
    readyState: WebSocket.OPEN,
    send: jest.fn(),
  };

  const mockClient2 = {
    readyState: WebSocket.OPEN,
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Inicializar wss con un mock de Server
    const mockServer = {} as Server;
    initializeWebSocket(mockServer);
    // Limpiar y agregar clientes mockeados
    mockClients.clear();
    mockClients.add(mockClient1 as any);
    mockClients.add(mockClient2 as any);
  });

  it("notifica a todos los clientes conectados", () => {
    const payload = { type: "ORDER_NEW", order: { id: "123" } };

    notifyClients(payload);

    expect(mockClient1.send).toHaveBeenCalledWith(JSON.stringify(payload));
    expect(mockClient2.send).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it("solo envía a clientes con estado OPEN", () => {
    const closedClient = {
      readyState: WebSocket.CLOSED,
      send: jest.fn(),
    };

    mockClients.add(closedClient as any);
    notifyClients({ type: "TEST" });

    expect(closedClient.send).not.toHaveBeenCalled();
    expect(mockClient1.send).toHaveBeenCalled();
  });

  it("serializa payload a JSON", () => {
    const complexPayload = {
      type: "ORDER_READY",
      id: "abc-123",
      finishedAt: new Date("2025-01-01").toISOString(),
    };

    notifyClients(complexPayload);

    expect(mockClient1.send).toHaveBeenCalledWith(JSON.stringify(complexPayload));
  });
});
