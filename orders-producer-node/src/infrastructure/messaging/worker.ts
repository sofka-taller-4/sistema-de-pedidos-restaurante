// src/infrastructure/messaging/worker.ts
import { notifyClients } from "../websocket/ws-server";
import { OrderMessage, KitchenOrder } from "../../domain/models/order";
import { createKitchenOrderFromMessage } from "../../application/factories/order.factory";
import { ProductRepository } from "../database/repositories/product.repository";
import { getChannel, sendToDLQ } from "./amqp.connection";
import {
  addKitchenOrder,
  getRepository,
} from "../http/controllers/kitchen.controller";

/**
 * Enriches order items with preparation time from products collection.
 * Reduces cognitive complexity by extracting common logic.
 */
async function enrichItemsWithPreparationTime(items: any[], verbose = false): Promise<any[]> {
  try {
    const prodRepo = new ProductRepository();
    return await Promise.all(
      (items || []).map(async (it) => {
        const product = await prodRepo.getByName(it.productName);
        if (verbose) {
          console.log(`🔍 Buscando producto "${it.productName}":`, product ? `✅ Encontrado (prep: ${product.preparationTime}min)` : `❌ No encontrado`);
        }
        return product && product.preparationTime
          ? { ...it, preparationTimeSeconds: product.preparationTime * 60 }
          : it;
      })
    );
  } catch (e) {
    console.error("⚠️ No se pudieron adjuntar tiempos de preparación:", e);
    return items ?? [];
  }
}

/**
 * Handles updating an existing order in the kitchen.
 * Extracted to reduce complexity in main consumer callback.
 */
async function handleExistingOrder(pedido: OrderMessage, existingOrder: KitchenOrder): Promise<void> {
  console.log(`📝 Actualizando pedido existente: ${pedido.id}`);

  const updatedOrder = createKitchenOrderFromMessage(pedido);
  updatedOrder.status = existingOrder.status;
  updatedOrder.items = await enrichItemsWithPreparationTime(updatedOrder.items, false);

  const repo = getRepository();
  await repo.remove(pedido.id);
  await repo.create(updatedOrder);

  notifyClients({ type: "ORDER_UPDATED", order: updatedOrder });
  console.log(`✅ Pedido ${pedido.id} actualizado en cocina`);
}

/**
 * Handles creating a new order in the kitchen.
 * Extracted to reduce complexity in main consumer callback.
 */
async function handleNewOrder(pedido: OrderMessage): Promise<void> {
  console.log(`🆕 Nuevo pedido: ${pedido.id}`);

  const kitchenOrder = createKitchenOrderFromMessage(pedido);
  kitchenOrder.items = await enrichItemsWithPreparationTime(kitchenOrder.items, true);

  console.log(`📦 Items enriquecidos:`, JSON.stringify(kitchenOrder.items, null, 2));

  await addKitchenOrder(kitchenOrder);
  notifyClients({ type: "ORDER_NEW", order: kitchenOrder });
  console.log(`✅ Pedido ${pedido.id} agregado a cocina con estado: pending`);
}

/**
 * Checks queue status and notifies if empty.
 * Extracted to reduce cognitive complexity.
 */
async function checkQueueAndNotify(channel: any, queue: string): Promise<void> {
  const queueInfo = await channel.checkQueue(queue);
  if (queueInfo.messageCount === 0) {
    notifyClients({
      type: "QUEUE_EMPTY",
      message: "🕒 Esperando nuevos pedidos..."
    });
    console.log("🕒 Esperando nuevos pedidos...");
  }
}

/**
 * Prepares and sends failed message to Dead Letter Queue.
 * Extracted to reduce error handling complexity.
 */
async function handleFailedMessage(channel: any, msg: any, err: any, correlationId?: string): Promise<void> {
  console.error("⚠️ Error procesando pedido (will DLQ):", err);

  let payload = msg.content;
  if (correlationId) {
    try {
      const obj = JSON.parse(msg.content.toString());
      obj._dlq = obj._dlq || {};
      obj._dlq.correlationId = correlationId;
      payload = Buffer.from(JSON.stringify(obj));
    } catch (error_) {
      console.error("⚠️ Error agregando correlationId a DLQ:", error_);
    }
  }

  await sendToDLQ(channel, "orders.failed", payload);
}

/**
 * Extracts correlation ID from message properties.
 * Centralized logic for clarity.
 */
function extractCorrelationId(msg: any): string | undefined {
  return (msg.properties && (msg.properties.correlationId || msg.properties.headers?.['x-correlation-id'])) || undefined;
}

export async function startWorker() {
  try {
    const channel = await getChannel();
    const queue = "orders.new";

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log("📥 Worker de cocina escuchando pedidos nuevos (orders.new)...");

    channel.consume(
      queue,
      async (msg: any) => {
        if (!msg) return;

        const correlationId = extractCorrelationId(msg);

        try {
          const pedido: OrderMessage = JSON.parse(msg.content.toString());
          console.log("🍽️ Pedido recibido:", pedido.id);

          const repo = getRepository();
          const existingOrder = await repo.getById(pedido.id);

          if (existingOrder) {
            await handleExistingOrder(pedido, existingOrder);
          } else {
            await handleNewOrder(pedido);
          }

          channel.ack(msg);
          await checkQueueAndNotify(channel, queue);

        } catch (err) {
          try {
            await handleFailedMessage(channel, msg, err, correlationId);
          } catch (error_) {
            console.error("⚠️ Error enviando a DLQ:", error_);
          } finally {
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );
  } catch (err) {
    console.error("❌ Error en el worker:", err);
  }
}
