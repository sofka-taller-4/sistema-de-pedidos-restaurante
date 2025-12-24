import { render, screen, fireEvent } from '@testing-library/react';
import { KitchenOrderCard } from '../components/KitchenOrderCard';
import { vi } from 'vitest';

describe('KitchenOrderCard', () => {
  const baseOrder = {
    id: 'ORD-1',
    customerName: 'Carlos',
    time: '12:00',
    table: 'Mesa 5',
    products: [
      { name: 'Pizza', quantity: 2, price: 25000 },
      { name: 'Agua', quantity: 1, price: 3000 },
    ],
    total: 53000,
    status: 'Nueva Orden',
    estimatedPrepTime: 15,
    prepStartTime: undefined,
  };

  it('renderiza datos básicos de la orden', () => {
    render(<KitchenOrderCard order={baseOrder} />);
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('Mesa 5')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Pizza'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Agua'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('53.000'))).toBeInTheDocument();
    expect(screen.getByText('Nueva Orden')).toBeInTheDocument();
  });

  it('muestra el tiempo estimado para Nueva Orden', () => {
    render(<KitchenOrderCard order={baseOrder} />);
    expect(screen.getByText(/Tiempo estimado/)).toBeInTheDocument();
    expect(screen.getByText(/15 minutos/)).toBeInTheDocument();
  });

  it('llama onStartCooking al hacer click en Comenzar a Cocinar', () => {
    const onStartCooking = vi.fn();
    render(<KitchenOrderCard order={baseOrder} onStartCooking={onStartCooking} />);
    fireEvent.click(screen.getByText('Comenzar a Cocinar'));
    expect(onStartCooking).toHaveBeenCalledWith('ORD-1');
  });

  it('muestra el temporizador y botón Orden Preparada en Preparando', () => {
    const order = { ...baseOrder, status: 'Preparando', prepStartTime: Date.now() };
    const onMarkAsReady = vi.fn();
    render(<KitchenOrderCard order={order} onMarkAsReady={onMarkAsReady} />);
    expect(screen.getByText('Preparando')).toBeInTheDocument();
    expect(screen.getByText('Orden Preparada')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Orden Preparada'));
    expect(onMarkAsReady).toHaveBeenCalledWith('ORD-1');
  });

  it('muestra botón Orden entregada en Listo', () => {
    const order = { ...baseOrder, status: 'Listo' };
    const onComplete = vi.fn();
    render(<KitchenOrderCard order={order} onComplete={onComplete} />);
    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByText('Orden entregada')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Orden entregada'));
    expect(onComplete).toHaveBeenCalledWith('ORD-1');
  });

  it('muestra mensaje de finalizada', () => {
    const order = { ...baseOrder, status: 'Finalizada' };
    render(<KitchenOrderCard order={order} />);
    expect(screen.getByText('Orden Finalizada')).toBeInTheDocument();
  });

  it('muestra mensaje de cancelada', () => {
    const order = { ...baseOrder, status: 'Cancelada' };
    render(<KitchenOrderCard order={order} />);
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });
});
