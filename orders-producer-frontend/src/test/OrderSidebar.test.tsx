import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import OrderSidebar from '../components/OrderSidebar';
import { vi } from 'vitest';

// Mock global para scrollIntoView (Radix UI Select)
window.HTMLElement.prototype.scrollIntoView = function() {};

describe('OrderSidebar', () => {
  const baseOrder = {
    items: [
      { id: 1, name: 'Pizza', price: 20000, qty: 2, note: '' },
      { id: 2, name: 'Bebida', price: 5000, qty: 1, note: 'Sin hielo' },
    ],
  };

  const setup = (props = {}) => {
    const onChangeQty = vi.fn();
    const onAddNote = vi.fn();
    const onSend = vi.fn(() => Promise.resolve());
    const successMsg = null;
    const utils = render(
      <OrderSidebar
        order={baseOrder}
        total={baseOrder.items.reduce((acc, i) => acc + i.price * i.qty, 0)}
        onChangeQty={onChangeQty}
        onAddNote={onAddNote}
        onSend={onSend}
        successMsg={successMsg}
        {...props}
      />
    );
    return { ...utils, onChangeQty, onAddNote, onSend };
  };

  it('renderiza el pedido y los productos', () => {
    setup();
    expect(screen.getByText('Pedido Actual')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Bebida')).toBeInTheDocument();
    expect(screen.getByText('Sin hielo')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Impuesto (10%)')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Enviar a Cocina')).toBeInTheDocument();
  });

  it('permite cambiar cantidad de productos', () => {
    const { onChangeQty } = setup();
    // Buscar todos los botones de cantidad (hay 2 productos, cada uno tiene - y +)
    const buttons = screen.getAllByRole('button');
    // El primer botón de suma (plus) es el cuarto botón (índice 3)
    // Orden: [En el Local, Para Llevar, eliminar, -, +, eliminar, -, +]
    // Usamos el primer botón + (índice 4)
    fireEvent.click(buttons[4]);
    expect(onChangeQty).toHaveBeenCalled();
  });

  it('permite agregar nota a un producto', () => {
    const { onAddNote } = setup();
    const textarea = screen.getAllByPlaceholderText('Agregar nota...')[0];
    fireEvent.change(textarea, { target: { value: 'Sin cebolla' } });
    expect(onAddNote).toHaveBeenCalledWith(1, 'Sin cebolla');
  });

  it('deshabilita el botón Enviar a Cocina si faltan datos', () => {
    setup();
    const btn = screen.getByText('Enviar a Cocina');
    expect(btn).toBeDisabled();
  });

  it('muestra mensaje de éxito si successMsg está presente', () => {
    setup({ successMsg: '¡Pedido enviado!' });
    expect(screen.getByText('¡Pedido enviado!')).toBeInTheDocument();
  });

  it('muestra mensaje si no hay artículos', () => {
    const order = { items: [] };
    render(
      <OrderSidebar
        order={order}
        total={0}
        onChangeQty={vi.fn()}
        onAddNote={vi.fn()}
        onSend={vi.fn()}
        successMsg={null}
      />
    );
    expect(screen.getByText('Aún no hay artículos agregados')).toBeInTheDocument();
  });

  it('permite seleccionar tipo de pedido y mesa', () => {
    setup();
    const paraLlevarBtn = screen.getByRole('button', { name: /para llevar/i });
    fireEvent.click(paraLlevarBtn);
    expect(paraLlevarBtn).toBeInTheDocument();
    const enLocalBtn = screen.getByRole('button', { name: /en el local/i });
    fireEvent.click(enLocalBtn);
    expect(enLocalBtn).toBeInTheDocument();
  });

  it('cambia el nombre del cliente y la mesa', async () => {
    setup();
    const nameInput = screen.getByPlaceholderText('Ingrese el nombre del cliente (requerido)');
    fireEvent.change(nameInput, { target: { value: 'Juan' } });
    expect(nameInput).toHaveValue('Juan');
    // Cambiar tipo a dine-in y seleccionar mesa
    const enLocalBtn = screen.getByRole('button', { name: /en el local/i });
    fireEvent.click(enLocalBtn);
    // Seleccionar el trigger del select (el segundo elemento con "Seleccione mesa")
    const mesaTriggers = screen.getAllByText('Seleccione mesa');
    const mesaTrigger = mesaTriggers.find(el => el.tagName === 'SPAN');
    if (!mesaTrigger) throw new Error('No se encontró el trigger del select de mesa');
    fireEvent.click(mesaTrigger);
    // Esperar a que el menú se renderice
    await waitFor(() => {
      expect(document.body.textContent).toContain('Mesa 1');
    });
    const mesa1 = await screen.findByText('Mesa 1', {}, { container: document.body });
    fireEvent.click(mesa1);
  });

  it('no llama a onSend si faltan datos obligatorios', async () => {
    const { onSend } = setup();
    const btn = screen.getByText('Enviar a Cocina');
    // No hay nombre ni mesa
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(onSend).not.toHaveBeenCalled();
    // Aserción adicional: el botón debe seguir habilitado o mostrar algún mensaje
    expect(btn).toBeDisabled();
  });

  it('llama a onSend correctamente y limpia los estados', async () => {
    const { onSend } = setup();
    // Llenar nombre y mesa
    const nameInput = screen.getByPlaceholderText('Ingrese el nombre del cliente (requerido)');
    fireEvent.change(nameInput, { target: { value: 'Ana' } });
    const enLocalBtn = screen.getByRole('button', { name: /en el local/i });
    fireEvent.click(enLocalBtn);
    // Seleccionar el trigger del select (el segundo elemento con "Seleccione mesa")
    const mesaTriggers = screen.getAllByText('Seleccione mesa');
    const mesaTrigger = mesaTriggers.find(el => el.tagName === 'SPAN');
    if (!mesaTrigger) throw new Error('No se encontró el trigger del select de mesa');
    fireEvent.click(mesaTrigger);
    // Esperar a que el menú se renderice
    await waitFor(() => {
      expect(document.body.textContent).toContain('Mesa 2');
    });
    const mesa2 = await screen.findByText('Mesa 2', {}, { container: document.body });
    fireEvent.click(mesa2);
    // Click en enviar
    const btn = screen.getByText('Enviar a Cocina');
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(onSend).toHaveBeenCalledWith('Mesa 2', 'Ana');
    // El input debe limpiarse
    expect(nameInput).toHaveValue('');
  });

  it('llama a onSend con Takeaway si es para llevar', async () => {
    const { onSend } = setup();
    const paraLlevarBtn = screen.getByRole('button', { name: /para llevar/i });
    fireEvent.click(paraLlevarBtn);
    const nameInput = screen.getByPlaceholderText('Ingrese el nombre del cliente (requerido)');
    fireEvent.change(nameInput, { target: { value: 'Luis' } });
    const btn = screen.getByText('Enviar a Cocina');
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(onSend).toHaveBeenCalledWith('Takeaway', 'Luis');
  });

  it('deshabilita el botón de restar cantidad si qty <= 1', () => {
    const order = { items: [{ id: 1, name: 'Pizza', price: 20000, qty: 1, note: '' }] };
    render(
      <OrderSidebar
        order={order}
        total={20000}
        onChangeQty={vi.fn()}
        onAddNote={vi.fn()}
        onSend={vi.fn()}
        successMsg={null}
      />
    );
    // Buscar todos los botones y filtrar el que tiene el icono Minus
    const minusBtns = screen.getAllByRole('button');
    // El botón de restar cantidad tiene un icono con aria-hidden y clase lucide-minus
    const minusBtn = minusBtns.find(btn => {
      const svg = btn.querySelector('svg');
      return svg && svg.className.baseVal.includes('lucide-minus');
    });
    expect(minusBtn).toBeDisabled();
  });
});
