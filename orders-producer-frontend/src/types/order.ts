// KitchenOrder: usado por la cocina y el frontend
export interface KitchenOrder {
  id: string;
  fullId?: string;
  customerName: string;
  time: string;
  table: string;
  products: {
    name: string;
    quantity: number;
    price: number;
    preparationTime?: number;
  }[];
  total: number;
  status: import('../components/KitchenOrderCard').OrderStatus;
  estimatedPrepTime?: number;
  prepStartTime?: number;
  phone?: string;
}
export interface Product {
  id: number;
  name: string;
  price: number;
  desc: string;
  image: string;
  category?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  note?: string;
}

export interface Order {
  items: OrderItem[];
}

export type OrderStatus = 'pendiente' | 'en-preparacion' | 'listo';

export interface ProductoItem {
  nombre: string;
  cantidad: number;
  unitPrice: number;
  subtotal: number;
  note: string | null;
}

export interface Pedido {
  id: string;
  mesa: string;
  cliente: string;
  productos: ProductoItem[];
  especificaciones: string[];
  total: number;
  estado: OrderStatus;
}

export interface OrderPayload {
  customerName: string;
  table: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    note: string | null;
  }[];
}

export interface KitchenOrderMessage {
  id: string;
  customerName: string;
  table: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    note?: string;
  }[];
}

// API Gateway response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code: number;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// API Order type (from backend/API Gateway)
export interface ApiOrder {
  id: string;
  customerName: string;
  table: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    note?: string | null;
  }[];
  status?: 'pending' | 'preparing' | 'ready';
  createdAt: string;
}

export type OrderResponse = ApiResponse<ApiOrder>;
export type KitchenOrdersResponse = ApiResponse<ApiOrder[]>;
