import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchCategories,
  fetchPublicCategories,
  createCategory,
  deleteCategory
} from '../services/categoryService';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Category Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('fetchCategories', () => {
    it('fetches categories successfully with authentication', async () => {
      const mockCategories = [
        { id: '1', name: 'Bebidas' },
        { id: '2', name: 'Comidas' },
        { id: '3', name: 'Postres' }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories })
      });

      const result = await fetchCategories();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/categories'),
        expect.objectContaining({
          credentials: 'include'
        })
      );

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Bebidas');
    });

    it('throws error on failed fetch', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Unauthorized' })
      });

      await expect(fetchCategories()).rejects.toThrow('Unauthorized');
    });

    it('throws generic error when no message provided', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(fetchCategories()).rejects.toThrow('Error al obtener categorías');
    });
  });

  describe('fetchPublicCategories', () => {
    it('fetches public categories without authentication', async () => {
      const mockCategories = [
        { id: '1', name: 'Entradas' },
        { id: '2', name: 'Platos Fuertes' }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories })
      });

      const result = await fetchPublicCategories();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/categories/public/list')
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Entradas');
    });

    it('throws error on failed public fetch', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Service unavailable' })
      });

      await expect(fetchPublicCategories()).rejects.toThrow('Service unavailable');
    });
  });

  describe('createCategory', () => {
    it('creates a new category successfully', async () => {
      const newCategory = { id: '4', name: 'Sopas' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newCategory })
      });

      const result = await createCategory('Sopas');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/categories'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: 'Sopas' })
        })
      );

      expect(result.name).toBe('Sopas');
    });

    it('throws error on failed creation', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Category already exists' })
      });

      await expect(createCategory('Bebidas')).rejects.toThrow(
        'Category already exists'
      );
    });

    it('throws generic error when no message provided', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(createCategory('Test')).rejects.toThrow('Error al crear categoría');
    });
  });

  describe('deleteCategory', () => {
    it('deletes category successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Category deleted' })
      });

      const result = await deleteCategory('123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/categories/123'),
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );

      expect(result.success).toBe(true);
    });

    it('throws error on failed deletion', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Category has products' })
      });

      await expect(deleteCategory('123')).rejects.toThrow('Category has products');
    });

    it('throws generic error when no message provided', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(deleteCategory('123')).rejects.toThrow(
        'Error al eliminar categoría'
      );
    });
  });
});
