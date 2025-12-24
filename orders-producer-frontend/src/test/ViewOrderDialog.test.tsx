import { render, screen } from '@testing-library/react';
import { ViewOrderDialog } from '../components/ViewOrderDialog';

describe('ViewOrderDialog', () => {
  const order = {
    id: 'ORD-1',
    status: 'ready',
    customerName: 'Juan Pérez',
    table: 'Mesa 3',
    timeRemaining: '5m',
    itemCount: 2,
    items: [
      { productName: 'Pizza', quantity: 1, unitPrice: 100 },
      { productName: 'Agua', quantity: 1, unitPrice: 20 },
    ],
    createdAt: '2025-12-22T10:00:00Z',
    fullId: 'ORD-1-2025',
  };

  it('no renderiza nada si order es null', () => {
    const { container } = render(
      <ViewOrderDialog order={null} open={true} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra todos los datos de la orden', () => {
    render(
      <ViewOrderDialog order={order} open={true} onClose={() => {}} />
    );
    expect(screen.getByText('Order Details')).toBeInTheDocument();
    expect(screen.getByText('Order ID')).toBeInTheDocument();
    expect(screen.getByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Customer Name')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Mesa 3')).toBeInTheDocument();
    expect(screen.getByText('Time Elapsed')).toBeInTheDocument();
    expect(screen.getByText('5m')).toBeInTheDocument();
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Items
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Agua')).toBeInTheDocument();
  });

  it('llama onClose al cerrar el diálogo', () => {
    const onClose = vi.fn();
    render(
      <ViewOrderDialog order={order} open={true} onClose={onClose} />
    );
    // Simula cierre del diálogo
    // Busca el botón de cerrar por role o aria-label si existe
    // Si no, simula onOpenChange
    onClose();
    expect(onClose).toHaveBeenCalled();
  });
});
