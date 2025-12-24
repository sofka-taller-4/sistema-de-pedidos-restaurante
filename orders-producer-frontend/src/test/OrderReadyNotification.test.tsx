
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OrderReadyNotification } from '../components/OrderReadyNotification';

describe('OrderReadyNotification', () => {
  const order = {
    id: 'ORD-1',
    fullId: 'ORD-1-2025',
    table: '5',
    itemCount: 3,
    // ...otros campos que no se usan en el render
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock play() para que retorne una Promise
    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('no renderiza nada si order es null', () => {
    let container;
    act(() => {
      ({ container } = render(
        <OrderReadyNotification order={null} open={true} onMarkAsDelivered={() => {}} onSnooze={() => {}} onClose={() => {}} />
      ));
    });
    expect(container.firstChild).toBeNull();
  });

  it('muestra los datos de la orden y botones', () => {
    act(() => {
      render(
        <OrderReadyNotification order={order} open={true} onMarkAsDelivered={() => {}} onSnooze={() => {}} onClose={() => {}} />
      );
    });
    expect(screen.getByText('¡Orden Lista!')).toBeInTheDocument();
    expect(screen.getByText('Mesa:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Pedido:')).toBeInTheDocument();
    expect(screen.getByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('Artículos:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Marcar como Entregada')).toBeInTheDocument();
    expect(screen.getByText('Posponer 30 segundos')).toBeInTheDocument();
  });

  it('llama onMarkAsDelivered con el id correcto', () => {
    const onMarkAsDelivered = vi.fn();
    act(() => {
      render(
        <OrderReadyNotification order={order} open={true} onMarkAsDelivered={onMarkAsDelivered} onSnooze={() => {}} onClose={() => {}} />
      );
    });
    fireEvent.click(screen.getByText('Marcar como Entregada'));
    expect(onMarkAsDelivered).toHaveBeenCalledWith('ORD-1-2025');
  });

  it('llama onSnooze al hacer click en posponer', () => {
    const onSnooze = vi.fn();
    act(() => {
      render(
        <OrderReadyNotification order={order} open={true} onMarkAsDelivered={() => {}} onSnooze={onSnooze} onClose={() => {}} />
      );
    });
    fireEvent.click(screen.getByText('Posponer 30 segundos'));
    expect(onSnooze).toHaveBeenCalled();
  });

  it('muestra el countdown y lo decrementa', () => {
    act(() => {
      render(
        <OrderReadyNotification order={order} open={true} onMarkAsDelivered={() => {}} onSnooze={() => {}} onClose={() => {}} />
      );
    });
    expect(screen.getByText(/se cerrará en 30 segundos/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/se cerrará en 28 segundos/)).toBeInTheDocument();
  });

  it('reproduce el sonido al abrir (mock)', () => {
    const playMock = vi.fn(() => Promise.resolve());
    window.HTMLMediaElement.prototype.play = playMock;
    act(() => {
      render(
        <OrderReadyNotification order={order} open={true} onMarkAsDelivered={() => {}} onSnooze={() => {}} onClose={() => {}} />
      );
    });
    expect(playMock).toHaveBeenCalled();
  });
});
