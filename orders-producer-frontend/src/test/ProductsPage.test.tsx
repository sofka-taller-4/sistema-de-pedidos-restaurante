import { render, fireEvent, waitFor } from '@testing-library/react';
import ProductsPage from '../pages/admin/ProductsPage';
import * as authStore from '../store/auth';
import * as adminService from '../services/adminService';
import * as categoryService from '../services/categoryService';
import React from 'react';

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({}),
    })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('permite guardar un producto nuevo correctamente', async () => {
    const { findByPlaceholderText, findByText, getByText } = render(<ProductsPage />);
    const nombre = await findByPlaceholderText('Nombre');
    const precio = await findByPlaceholderText('Precio');
    const categoria = await findByPlaceholderText('Tiempo de Preparación (min)');
    const selectCat = document.querySelector('select[required]');
    // Llenar formulario
    fireEvent.change(nombre, { target: { value: 'Nuevo Producto' } });
    fireEvent.change(precio, { target: { value: '12345' } });
    fireEvent.change(selectCat!, { target: { value: 'Pizzas' } });
    fireEvent.change(categoria, { target: { value: '10' } });
    // Guardar
    fireEvent.submit(nombre.closest('form')!);
    expect(await findByText(/guardado correctamente/i)).toBeInTheDocument();
  });

  it('muestra error si el tiempo de preparación es inválido', async () => {
    const { findByPlaceholderText, findByText } = render(<ProductsPage />);
    const nombre = await findByPlaceholderText('Nombre');
    const precio = await findByPlaceholderText('Precio');
    const categoria = await findByPlaceholderText('Tiempo de Preparación (min)');
    const selectCat = document.querySelector('select[required]');
    fireEvent.change(nombre, { target: { value: 'Producto Inválido' } });
    fireEvent.change(precio, { target: { value: '1000' } });
    fireEvent.change(selectCat!, { target: { value: 'Pizzas' } });
    fireEvent.change(categoria, { target: { value: '0' } });
    fireEvent.submit(nombre.closest('form')!);
    expect(await findByText(/tiempo de preparación.*obligatorio/i)).toBeInTheDocument();
  });

  it('muestra error si ocurre error al guardar producto', async () => {
    vi.spyOn(adminService, 'upsertProduct').mockRejectedValueOnce(new Error('Error grave'));
    const { findByPlaceholderText, findByText } = render(<ProductsPage />);
    const nombre = await findByPlaceholderText('Nombre');
    const precio = await findByPlaceholderText('Precio');
    const categoria = await findByPlaceholderText('Tiempo de Preparación (min)');
    const selectCat = document.querySelector('select[required]');
    fireEvent.change(nombre, { target: { value: 'Error Producto' } });
    fireEvent.change(precio, { target: { value: '1000' } });
    fireEvent.change(selectCat!, { target: { value: 'Pizzas' } });
    fireEvent.change(categoria, { target: { value: '10' } });
    fireEvent.submit(nombre.closest('form')!);
    expect(await findByText('Error grave')).toBeInTheDocument();
  });

  it('permite eliminar un producto y confirma', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    window.confirm = vi.fn(() => true);
    const { findByTitle, findByText } = render(<ProductsPage />);
    const deleteBtn = await findByTitle('Eliminar');
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    // No error esperado, solo recarga
    expect(await findByText(/productos registrados/i)).toBeInTheDocument();
  });

  it('muestra error si ocurre error al eliminar producto', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    vi.spyOn(adminService, 'deleteProduct').mockRejectedValueOnce(new Error('Error grave'));
    window.confirm = vi.fn(() => true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { findByTitle } = render(<ProductsPage />);
    const deleteBtn = await findByTitle('Eliminar');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error grave');
    });
    alertSpy.mockRestore();
  });

  it('permite alternar el estado de un producto', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    const { findByTitle } = render(<ProductsPage />);
    const toggleBtn = await findByTitle('Desactivar');
    fireEvent.click(toggleBtn);
    expect(adminService.toggleProduct).toHaveBeenCalledWith(1);
  });

  it('muestra loading mientras carga productos', async () => {
    let resolve: (v: any) => void;
    vi.spyOn(adminService, 'fetchProducts').mockImplementation(() => new Promise(r => { resolve = r; }));
    const { container } = render(<ProductsPage />);
    // Buscar el spinner por clase
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    resolve!({ data: [] });
  });

  it('permite cancelar la edición de un producto', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    const { findByTitle, findByText, findByDisplayValue } = render(<ProductsPage />);
    const editBtn = await findByTitle('Editar');
    fireEvent.click(editBtn);
    expect(await findByDisplayValue('Pizza Margarita')).toBeInTheDocument();
    const cancelBtn = await findByText(/cancelar edición/i);
    fireEvent.click(cancelBtn);
    expect((await findByText(/crear\/editar producto/i))).toBeInTheDocument();
  });

  it('no permite acciones si no está autenticado', async () => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: false });
    const { getByText, queryByText, getByPlaceholderText } = render(<ProductsPage />);
    // Simular submit del formulario
    const guardarBtn = getByText('Guardar Producto');
    const nombreInput = getByPlaceholderText('Nombre');
    nombreInput.value = 'Producto No Permitido';
    guardarBtn.click();
    // No debe aparecer mensaje de éxito
    expect(queryByText(/guardado correctamente/i)).toBeNull();
    // No debe aparecer el producto en la tabla
    expect(queryByText('Producto No Permitido')).toBeNull();
  });
  const baseProduct = {
    id: 1,
    name: 'Pizza Margarita',
    price: 25000,
    description: 'Clásica pizza italiana',
    image: '',
    enabled: true,
    category: 'Pizzas',
    preparationTime: 15,
    _id: 'abc123',
    createdAt: '',
    updatedAt: ''
  };

  beforeEach(() => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: true });
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [] });
    vi.spyOn(adminService, 'toggleProduct').mockResolvedValue({});
    vi.spyOn(adminService, 'upsertProduct').mockResolvedValue({ success: true });
    vi.spyOn(adminService, 'deleteProduct').mockResolvedValue({});
    vi.spyOn(categoryService, 'fetchCategories').mockResolvedValue([{ name: 'Pizzas' }]);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin crashear (sin productos)', async () => {
    const { findByText } = render(<ProductsPage />);
    expect(await findByText(/Crear\/Editar Producto/i)).toBeInTheDocument();
    expect(await findByText(/No hay productos registrados/i)).toBeInTheDocument();
  });

  it('renderiza productos existentes', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    const { findByText, findAllByText, container } = render(<ProductsPage />);
    expect(await findByText('Pizza Margarita')).toBeInTheDocument();
    // Filtrar el span de la tabla, no el option
    const allPizzas = await findAllByText('Pizzas');
    const spanPizzas = allPizzas.find(el => el.tagName === 'SPAN');
    expect(spanPizzas).toBeInTheDocument();
    expect(await findByText('✅ Activo')).toBeInTheDocument();
    expect((await findAllByText(/Productos Registrados/i))[0]).toBeInTheDocument();
  });

  it('permite editar un producto', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    const { findByTitle, findByDisplayValue } = render(<ProductsPage />);
    const editBtn = await findByTitle('Editar');
    fireEvent.click(editBtn);
    expect(await findByDisplayValue('Pizza Margarita')).toBeInTheDocument();
    expect(await findByDisplayValue('25000')).toBeInTheDocument();
  });

  it('permite eliminar un producto', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    window.confirm = vi.fn(() => true);
    const { findByTitle } = render(<ProductsPage />);
    const deleteBtn = await findByTitle('Eliminar');
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(adminService.deleteProduct).toHaveBeenCalledWith(1);
  });

  it('permite activar/desactivar un producto', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockResolvedValue({ data: [baseProduct] });
    const { findByTitle } = render(<ProductsPage />);
    const toggleBtn = await findByTitle('Desactivar');
    fireEvent.click(toggleBtn);
    expect(adminService.toggleProduct).toHaveBeenCalledWith(1);
  });

  it('muestra error si el tiempo de preparación es inválido', async () => {
    const { findByPlaceholderText, findByText, container } = render(<ProductsPage />);
    // Llenar los campos requeridos
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'Producto Test' } });
    fireEvent.change(await findByPlaceholderText('Precio'), { target: { value: '1000' } });
    // Seleccionar categoría
    const selects = container.querySelectorAll('select');
    const catSelect = Array.from(selects).find(sel =>
      Array.from(sel.options).some(opt => opt.textContent === 'Pizzas')
    );
    fireEvent.change(catSelect, { target: { value: 'Pizzas' } });
    // Tiempo inválido
    const prepInput = await findByPlaceholderText('Tiempo de Preparación (min)');
    fireEvent.change(prepInput, { target: { value: '0' } });
    const saveBtn = await findByText('Guardar Producto');
    fireEvent.click(saveBtn);
    // Buscar el mensaje de error por función matcher flexible
    await waitFor(() => {
      const errorDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /tiempo de preparación.*obligatorio/i.test(div.textContent)
      );
      expect(errorDiv).toBeInTheDocument();
    });
  });

  it('muestra mensaje de éxito tras guardar', async () => {
    const { findByPlaceholderText, findByText, container } = render(<ProductsPage />);
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'Nuevo Producto' } });
    fireEvent.change(await findByPlaceholderText('Precio'), { target: { value: '1000' } });
    fireEvent.change(await findByPlaceholderText('Tiempo de Preparación (min)'), { target: { value: '10' } });
    // Buscar el select de categoría por el primer select con opción "Pizzas"
    const selects = container.querySelectorAll('select');
    const catSelect = Array.from(selects).find(sel =>
      Array.from(sel.options).some(opt => opt.textContent === 'Pizzas')
    );
    fireEvent.change(catSelect, { target: { value: 'Pizzas' } });
    const saveBtn = await findByText('Guardar Producto');
    fireEvent.click(saveBtn);
    // Buscar el mensaje de éxito por función matcher flexible
    await waitFor(() => {
      const successDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /guardado correctamente/i.test(div.textContent)
      );
      expect(successDiv).toBeInTheDocument();
    });
  });

  it('muestra spinner de loading', async () => {
    vi.spyOn(adminService, 'fetchProducts').mockImplementation(() => new Promise(() => {}));
    const { container } = render(<ProductsPage />);
    // Busca el spinner por clase o rol
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
