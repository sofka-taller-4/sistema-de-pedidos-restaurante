import { render, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../pages/admin/SettingsPage';
import * as authStore from '../store/auth';
import * as categoryService from '../services/categoryService';
import React from 'react';

describe('SettingsPage', () => {
  const baseCategory = { _id: 'cat1', name: 'Hamburguesas' };

  beforeEach(() => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: true });
    vi.spyOn(categoryService, 'fetchCategories').mockResolvedValue([]);
    vi.spyOn(categoryService, 'createCategory').mockResolvedValue({});
    vi.spyOn(categoryService, 'deleteCategory').mockResolvedValue({});
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin crashear', async () => {
    const { findAllByText } = render(<SettingsPage />);
    const categorias = await findAllByText(/Categorías/i);
    expect(categorias.length).toBeGreaterThan(0);
  });

  it('renderiza categorías existentes', async () => {
    vi.spyOn(categoryService, 'fetchCategories').mockResolvedValue([baseCategory]);
    const { findByText } = render(<SettingsPage />);
    expect(await findByText('Hamburguesas')).toBeInTheDocument();
  });

  it('permite crear una categoría', async () => {
    const { findByPlaceholderText, findByText, container } = render(<SettingsPage />);
    const input = await findByPlaceholderText('Ej: Hamburguesas');
    fireEvent.change(input, { target: { value: 'NuevaCat' } });
    const btn = await findByText('Crear');
    fireEvent.click(btn);
    await waitFor(() => {
      const successDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /creada correctamente/i.test(div.textContent)
      );
      expect(successDiv).toBeInTheDocument();
    });
  });

  it('muestra error si el campo está vacío', async () => {
    const { findByText, container } = render(<SettingsPage />);
    const btn = await findByText('Crear');
    fireEvent.click(btn);
    await waitFor(() => {
      const errorDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /obligatorio/i.test(div.textContent)
      );
      expect(errorDiv).toBeInTheDocument();
    });
  });

  it('muestra error si la categoría ya existe', async () => {
    vi.spyOn(categoryService, 'fetchCategories').mockResolvedValue([baseCategory]);
    const { findByPlaceholderText, findByText, container } = render(<SettingsPage />);
    const input = await findByPlaceholderText('Ej: Hamburguesas');
    fireEvent.change(input, { target: { value: 'Hamburguesas' } });
    const btn = await findByText('Crear');
    fireEvent.click(btn);
    await waitFor(() => {
      const errorDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /ya existe/i.test(div.textContent)
      );
      expect(errorDiv).toBeInTheDocument();
    });
  });

  it('permite eliminar una categoría', async () => {
    vi.spyOn(categoryService, 'fetchCategories').mockResolvedValue([baseCategory]);
    window.confirm = vi.fn(() => true);
    const { findByTitle, container } = render(<SettingsPage />);
    const deleteBtn = await findByTitle('Eliminar');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      const successDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /eliminada correctamente/i.test(div.textContent)
      );
      expect(successDiv).toBeInTheDocument();
    });
  });

  it('muestra spinner de loading', async () => {
    vi.spyOn(categoryService, 'fetchCategories').mockImplementation(() => new Promise(() => {}));
    const { container } = render(<SettingsPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
