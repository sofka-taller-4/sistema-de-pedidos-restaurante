
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveOrdersTracker } from '../components/ActiveOrdersTracker';
import type { ActiveOrder } from '../hooks/useActiveOrders';
import { vi } from 'vitest';

describe('ActiveOrdersTracker', () => {
  const mockOrders: ActiveOrder[] = [
    {
      id: '1',
      table: 'Juan',
      status: 'pending',
      items: [],
      createdAt: '2025-12-22T10:00:00Z',
      timeRemaining: '10m',
      itemCount: 2,
      fullId: '1',
    },
    {
      id: '2',
      table: 'Ana',
      status: 'ready',
      items: [],
      createdAt: '2025-12-22T11:00:00Z',
      timeRemaining: '5m',
      itemCount: 1,
      fullId: '2',
    },
  ];

  it('renderiza correctamente el título y los filtros', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={mockOrders}
        ordersLoading={false}
        orderStatus="all"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Seguimiento de Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Preparando')).toBeInTheDocument();
    expect(screen.getByText('Listas')).toBeInTheDocument();
    expect(screen.getByText('Completadas')).toBeInTheDocument();
  });

  it('llama onOrderStatusChange al hacer click en un filtro', () => {
    const onOrderStatusChange = vi.fn();
    render(
      <ActiveOrdersTracker
        activeOrders={mockOrders}
        ordersLoading={false}
        orderStatus="all"
        onOrderStatusChange={onOrderStatusChange}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Pendientes'));
    expect(onOrderStatusChange).toHaveBeenCalledWith('pending');
  });

  it('muestra los pedidos activos y permite editar/ver', () => {
    const onEditOrder = vi.fn();
    const onViewOrder = vi.fn();
    render(
      <ActiveOrdersTracker
        activeOrders={mockOrders}
        ordersLoading={false}
        orderStatus="all"
        onOrderStatusChange={vi.fn()}
        onEditOrder={onEditOrder}
        onViewOrder={onViewOrder}
      />
    );
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    // Botón editar solo para pending
    const editBtn = screen.getAllByRole('button', { name: /edit order/i })[0];
    fireEvent.click(editBtn);
    expect(onEditOrder).toHaveBeenCalledWith(mockOrders[0]);
    // Botón ver solo para ready
    const viewBtn = screen.getAllByRole('button', { name: /view order details/i })[0];
    fireEvent.click(viewBtn);
    expect(onViewOrder).toHaveBeenCalledWith(mockOrders[1]);
    // Visualización de itemCount, timeRemaining y badge
    // Puede haber más de un elemento con el mismo texto (id, itemCount)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // itemCount o id
    expect(screen.getByText('10m')).toBeInTheDocument(); // timeRemaining Juan
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // itemCount o id
    expect(screen.getByText('5m')).toBeInTheDocument(); // timeRemaining Ana
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
  });

  it('filtra y muestra solo pedidos pendientes', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={mockOrders}
        ordersLoading={false}
        orderStatus="pending"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('filtra y muestra solo pedidos listos', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={mockOrders}
        ordersLoading={false}
        orderStatus="ready"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Juan')).not.toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
  });

  it('muestra mensaje si no hay pedidos activos para el filtro', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={[]}
        ordersLoading={false}
        orderStatus="pending"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('No hay pedidos activos')).toBeInTheDocument();
  });

  it('muestra correctamente el estado de carga con pedidos vacíos', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={[]}
        ordersLoading={true}
        orderStatus="all"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Cargando pedidos...')).toBeInTheDocument();
  });

  it('muestra correctamente el estado de carga', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={[]}
        ordersLoading={true}
        orderStatus="all"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Cargando pedidos...')).toBeInTheDocument();
  });

  it('maneja props vacíos sin errores', () => {
    render(
      <ActiveOrdersTracker
        activeOrders={[]}
        ordersLoading={false}
        orderStatus="all"
        onOrderStatusChange={vi.fn()}
        onEditOrder={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Seguimiento de Pedidos')).toBeInTheDocument();
  });
});
