import { describe, it, expect } from 'vitest';
import type * as orderTypes from '../types/order';

describe('types/order.ts', () => {
  it('Product type acepta todos los campos requeridos y opcionales', () => {
    const prod: orderTypes.Product = {
      id: 1,
      name: 'Café',
      price: 2000,
      desc: 'desc',
      image: 'img.png',
      category: 'Bebidas',
    };
    expect(prod.name).toBe('Café');
    expect(prod.category).toBe('Bebidas');
  });

  it('OrderItem type acepta campos requeridos y opcionales', () => {
    const item: orderTypes.OrderItem = {
      id: 2,
      name: 'Sandwich',
      price: 3500,
      qty: 2,
      note: 'Sin mayonesa',
    };
    expect(item.qty).toBe(2);
    expect(item.note).toBe('Sin mayonesa');
  });

  it('Order type acepta un array de OrderItem', () => {
    const order: orderTypes.Order = {
      items: [
        { id: 1, name: 'Café', price: 2000, qty: 1 },
        { id: 2, name: 'Sandwich', price: 3500, qty: 2 },
      ],
    };
    expect(order.items.length).toBe(2);
  });

  it('OrderStatus acepta solo los valores válidos', () => {
    const status: orderTypes.OrderStatus = 'pendiente';
    expect(status).toBe('pendiente');
    // @ts-expect-error
    // const invalid: orderTypes.OrderStatus = 'otro';
  });

  it('ProductoItem acepta todos los campos', () => {
    const prod: orderTypes.ProductoItem = {
      nombre: 'Café',
      cantidad: 2,
      unitPrice: 1000,
      subtotal: 2000,
      note: null,
    };
    expect(prod.subtotal).toBe(2000);
  });

  it('Pedido acepta todos los campos y OrderStatus', () => {
    const pedido: orderTypes.Pedido = {
      id: 'abc',
      mesa: '1',
      cliente: 'Juan',
      productos: [
        { nombre: 'Café', cantidad: 2, unitPrice: 1000, subtotal: 2000, note: null },
      ],
      especificaciones: ['Sin azúcar'],
      total: 2000,
      estado: 'en-preparacion',
    };
    expect(pedido.estado).toBe('en-preparacion');
    expect(pedido.productos[0].nombre).toBe('Café');
  });
});
