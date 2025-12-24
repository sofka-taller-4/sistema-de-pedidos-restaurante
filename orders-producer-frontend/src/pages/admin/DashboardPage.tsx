import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../store/auth';
import { fetchDashboard } from '../../services/adminService';
import { useDashboardUpdates } from '../../hooks/useDashboardUpdates';

type OrderStatus = 'pending' | 'preparing' | 'completed' | string;
interface OrderItem {
  quantity: number;
  productName: string;
}
interface RecentOrder {
  _id?: string;
  id?: string;
  customerName: string;
  table: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
}
interface StatusSnapshot {
  _id: OrderStatus;
  count: number;
}
interface DashboardSnapshot {
  byStatus: StatusSnapshot[];
  recent: RecentOrder[];
}
interface DashboardMetrics {
  ordersCount?: number;
  activeProducts?: number;
  rabbit?: { orders_new_depth?: number };
}

const DashboardPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({ byStatus: [], recent: [] });
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const { orders, metrics } = await fetchDashboard();
        setSnapshot(orders.data);
        setMetrics(metrics.data);
      } catch (err) {
        // Fallback visual: snapshot vacío y métricas vacías
        setSnapshot({ byStatus: [], recent: [] });
        setMetrics({});
        setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [isAuthenticated]);

  // Manejar nueva orden desde WebSocket
  const handleOrderNew = useCallback((order: any) => {
    console.log('📊 Dashboard: Nueva orden recibida:', order);
    setSnapshot(prev => {
      const newOrder: RecentOrder = {
        _id: order._id,
        id: order._id,
        customerName: order.customerName || 'Cliente',
        table: order.table || 'N/A',
        createdAt: order.createdAt,
        status: order.status || 'pending',
        items: order.items || []
      };
      return {
        ...prev,
        recent: [newOrder, ...prev.recent].slice(0, 10) // Añadir al inicio y limitar a 10
      };
    });
    // Incrementar contador de órdenes y actualizar estado
    setMetrics(prev => ({
      ...prev,
      ordersCount: (prev.ordersCount || 0) + 1
    }));
    // Actualizar contadores por estado
    setSnapshot(prev => {
      const newByStatus = [...prev.byStatus];
      const pendingIndex = newByStatus.findIndex(s => s._id === 'pending');
      if (pendingIndex >= 0) {
        newByStatus[pendingIndex].count += 1;
      } else {
        newByStatus.push({ _id: 'pending', count: 1 });
      }
      return { ...prev, byStatus: newByStatus };
    });
  }, []);

  // Manejar cambio de estado desde WebSocket
  const handleStatusChanged = useCallback((order: any) => {
    console.log('📊 Dashboard: Estado cambiado:', order.orderNumber || order._id, '->', order.status);
    const orderId = order._id;
    const newStatus = order.status;

    setSnapshot(prev => {
      // Buscar la orden anterior para saber su estado anterior
      const existingOrder = prev.recent.find(o => (o._id === orderId || o.id === orderId));
      const oldStatus = existingOrder?.status;

      // Actualizar la orden en la lista reciente
      const updatedRecent = prev.recent.map(o => 
        (o._id === orderId || o.id === orderId) 
          ? { ...o, status: newStatus }
          : o
      );

      // Actualizar contadores de estado
      let updatedByStatus = prev.byStatus;
      if (oldStatus && oldStatus !== newStatus) {
        updatedByStatus = prev.byStatus.map(s => {
          if (s._id === oldStatus) return { ...s, count: Math.max(0, s.count - 1) };
          if (s._id === newStatus) return { ...s, count: s.count + 1 };
          return s;
        });
      }

      return {
        ...prev,
        recent: updatedRecent,
        byStatus: updatedByStatus
      };
    });
  }, []);

  // Conectar al WebSocket para actualizaciones en tiempo real
  useDashboardUpdates(handleOrderNew, handleStatusChanged);


  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'En preparación';
      case 'completed': return 'Completado';
      default: return status;
    }
  };

  return (
    <div className="space-y-10 p-8 bg-neutral-100 dark:bg-neutral-900 min-h-screen transition-colors pl-64">
      {loading && (
        <output className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-10">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
        </output>
      )}
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="text-4xl">📊</span> Panel Principal
        </h2>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900 text-white p-7 rounded-2xl shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-200 text-sm font-medium mb-1">Órdenes Totales</div>
              <div className="text-5xl font-extrabold tracking-tight">{metrics.ordersCount ?? '-'}</div>
            </div>
            <div className="text-6xl opacity-20">🛒</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-800 dark:from-green-800 dark:to-green-900 text-white p-7 rounded-2xl shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-200 text-sm font-medium mb-1">Productos Activos</div>
              <div className="text-5xl font-extrabold tracking-tight">{metrics.activeProducts ?? '-'}</div>
            </div>
            <div className="text-6xl opacity-20">🍔</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 dark:from-purple-800 dark:to-purple-900 text-white p-7 rounded-2xl shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-200 text-sm font-medium mb-1">Cola RabbitMQ</div>
              <div className="text-5xl font-extrabold tracking-tight">{metrics.rabbit?.orders_new_depth ?? '—'}</div>
            </div>
            <div className="text-6xl opacity-20">📬</div>
          </div>
        </div>
      </div>

      {/* Órdenes por estado */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <span>📈</span> Órdenes por Estado
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(snapshot.byStatus || []).map((s) => (
            <div 
              key={s._id} 
              className={`p-5 rounded-xl border-2 ${getStatusColor(s._id)} font-semibold flex items-center justify-between shadow-sm bg-neutral-50 dark:bg-neutral-900/60`}
            >
              <span className="capitalize text-lg">{getStatusLabel(s._id)}</span>
              <span className="text-3xl font-bold">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Órdenes recientes */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <span>🕒</span> Órdenes Recientes
        </h3>
        
        {/* Filtros por estado */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
            }`}
          >
            📋 Todas
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
            }`}
          >
            ⏳ Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('preparing')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'preparing'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
            }`}
          >
            👨‍🍳 En preparación
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
            }`}
          >
            ✅ Completados
          </button>
        </div>

        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
          {(snapshot.recent || [])
            .filter(o => filterStatus === 'all' || o.status === filterStatus)
            .map((o, idx) => (
            <div 
              key={o.id} 
              className="border-l-4 border-blue-500 bg-neutral-50 dark:bg-neutral-900/60 p-5 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white text-lg">
                      👤 {o.customerName}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-300">
                      🪑 {o.table} • 📅 {(() => {
                        try {
                          const cleanedIso = o.createdAt.substring(0, 19);
                          const date = new Date(cleanedIso + 'Z');
                          return date.toLocaleString('es-CO', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'America/Bogota'
                          });
                        } catch (e) {
                          return 'N/A';
                        }
                      })()}
                    </div>
                  </div>
                </div>
                <span className={`px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(o.status)}`}>
                  {getStatusLabel(o.status)}
                </span>
              </div>
              {o.items && o.items.length > 0 && (
                <div className="mt-3 pl-14 text-sm text-neutral-700 dark:text-neutral-200">
                  <div className="flex flex-wrap gap-2">
                    {o.items.map((item, i) => (
                      <span key={i} className="bg-white dark:bg-neutral-700 px-3 py-1 rounded border border-neutral-200 dark:border-neutral-700">
                        {item.quantity}x {item.productName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {(snapshot.recent || []).filter(o => filterStatus === 'all' || o.status === filterStatus).length === 0 && (
            <div className="text-center text-neutral-500 dark:text-neutral-300 py-8">
              No hay órdenes {filterStatus === 'all' ? '' : `en estado "${getStatusLabel(filterStatus)}"`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
