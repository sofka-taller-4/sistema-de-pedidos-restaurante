export const ADMIN_API_BASE = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

export const ADMIN_ENDPOINTS = {
  LOGIN: `${ADMIN_API_BASE}/api/admin/auth/login`, // ✅ Por Gateway
  LOGOUT: `${ADMIN_API_BASE}/api/admin/auth/logout`, // ✅ Por Gateway
  USERS: `${ADMIN_API_BASE}/api/admin/users`,
  USER: (id: string) => `${ADMIN_API_BASE}/api/admin/users/${id}`,
  USER_ROLE: (id: string) => `${ADMIN_API_BASE}/api/admin/users/${id}/role`,
  PRODUCTS: `${ADMIN_API_BASE}/api/admin/products`,
  PRODUCT: (id: number) => `${ADMIN_API_BASE}/api/admin/products/${id}`,
  PRODUCT_TOGGLE: (id: number) => `${ADMIN_API_BASE}/api/admin/products/${id}/toggle`,
  DASHBOARD_ORDERS: `${ADMIN_API_BASE}/api/admin/dashboard/orders`,
  DASHBOARD_METRICS: `${ADMIN_API_BASE}/api/admin/dashboard/metrics`,
} as const;
