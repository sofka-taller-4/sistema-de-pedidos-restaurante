import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditOrderDialog } from '../components/EditOrderDialog';
import { vi } from 'vitest';

describe('EditOrderDialog', () => {
  const mockOrder = {
    id: '1',
    customerName: 'Juan',
    table: 'Mesa 1',
    status: 'pending',
    items: [
      { productName: 'Pizza', quantity: 2, unitPrice: 100 },
      { productName: 'Agua', quantity: 1, unitPrice: 20 },
    ],
    createdAt: '2025-12-22T10:00:00Z',
    timeRemaining: '10m',
    itemCount: 3,
    fullId: '1',
  };

  const mockProducts = [
    { id: 1, name: 'Pizza', price: 100, desc: 'Pizza grande', image: '' },
    { id: 2, name: 'Agua', price: 20, desc: 'Botella de agua', image: '' },
  ];

  it('renderiza el diálogo y muestra los datos del pedido', () => {
    render(
      <EditOrderDialog
        order={mockOrder}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        availableProducts={mockProducts}
      />
    );
    expect(screen.getByText(/Edit Order/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mesa 1')).toBeInTheDocument();
    expect(screen.getAllByText('Pizza').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agua').length).toBeGreaterThan(0);
  });

  it('permite editar el nombre del cliente y la mesa', () => {
    const onSave = vi.fn();
    render(
      <EditOrderDialog
        order={mockOrder}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
        availableProducts={mockProducts}
      />
    );
    fireEvent.change(screen.getByLabelText(/Customer Name/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/Table/i), { target: { value: 'Mesa 2' } });
    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mesa 2')).toBeInTheDocument();
  });

  it('llama onClose al cerrar el diálogo', () => {
    const onClose = vi.fn();
    render(
      <EditOrderDialog
        order={mockOrder}
        open={true}
        onClose={onClose}
        onSave={vi.fn()}
        availableProducts={mockProducts}
      />
    );
    // Busca el botón de cerrar por el icono X (puede ser aria-label o role)
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('llama onSave al guardar cambios', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <EditOrderDialog
        order={mockOrder}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
        availableProducts={mockProducts}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('1', expect.objectContaining({ customerName: 'Juan', table: 'Mesa 1' }));
    });
  });

  it('muestra error si onSave falla', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save error'));
    render(
      <EditOrderDialog
        order={mockOrder}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
        availableProducts={mockProducts}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/save error/i)).toBeInTheDocument();
    });
  });
    it('permite agregar un producto nuevo al pedido', () => {
      render(
        <EditOrderDialog
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          availableProducts={mockProducts}
        />
      );
        // Usa el aria-label del botón de agregar Agua
        const addAguaBtn = screen.getByLabelText('agregar Agua');
        fireEvent.click(addAguaBtn);
        expect(screen.getAllByText('Agua').length).toBeGreaterThan(1);
    });

    it('permite cambiar la cantidad de un producto', () => {
      render(
        <EditOrderDialog
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          availableProducts={mockProducts}
        />
      );
        // Usa el aria-label del botón de incrementar cantidad de Pizza
        const incPizzaBtn = screen.getByLabelText('incrementar cantidad de Pizza');
        fireEvent.click(incPizzaBtn);
        expect(screen.getAllByText('Pizza').length).toBeGreaterThan(0);
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('permite eliminar un producto del pedido', () => {
      render(
        <EditOrderDialog
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          availableProducts={mockProducts}
        />
      );
      // Contar instancias de "Pizza" antes de eliminar
      const before = screen.getAllByText('Pizza').length;
      const delPizzaBtn = screen.getByLabelText('eliminar Pizza');
      fireEvent.click(delPizzaBtn);
      // Contar instancias de "Pizza" después de eliminar
      const after = screen.queryAllByText('Pizza').length;
      expect(after).toBeLessThan(before);
    });

    it('permite agregar una nota a un item', () => {
      render(
        <EditOrderDialog
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          availableProducts={mockProducts}
        />
      );
      const noteInputs = screen.getAllByPlaceholderText(/special instructions/i);
      fireEvent.change(noteInputs[0], { target: { value: 'Sin cebolla' } });
      expect(noteInputs[0]).toHaveValue('Sin cebolla');
    });

    it('muestra error si el nombre del cliente está vacío', async () => {
      render(
        <EditOrderDialog
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          availableProducts={mockProducts}
        />
      );
      const nameInput = screen.getByLabelText(/customer name/i);
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(screen.getByText(/customer name is required/i)).toBeInTheDocument();
      });
    });

    it('muestra el total correctamente', () => {
      render(
        <EditOrderDialog
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          availableProducts={mockProducts}
        />
      );
      expect(screen.getByText('$220')).toBeInTheDocument();
    });
});
