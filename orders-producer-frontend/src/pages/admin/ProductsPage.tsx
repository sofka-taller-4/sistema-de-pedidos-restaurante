
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth';
import { fetchProducts, toggleProduct, upsertProduct, deleteProduct } from '../../services/adminService';
import { fetchCategories } from '../../services/categoryService';

interface Product {
  id?: number;
  name: string;
  price: number;
  description: string;
  image: string;
  enabled: boolean;
  category: string;
  preparationTime?: number;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ProductsPage: React.FC = () => {
  console.log('🎯 ProductsPage rendering');
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Eliminado editProduct completamente
  const [formState, setFormState] = useState<{
    id: string;
    name: string;
    price: string;
    description: string;
    image: string;
    enabled: string;
    category: string;
    preparationTime: string;
  }>({
    id: '',
    name: '',
    price: '',
    description: '',
    image: '',
    enabled: 'true',
    category: '',
    preparationTime: ''
  });

  const load = React.useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const res = await fetchProducts();
    setProducts(res.data || []);
    setLoading(false);
  }, [isAuthenticated]);
  
  useEffect(() => { 
    if (!isAuthenticated) return;
    
    const loadProducts = async () => {
      setLoading(true);
      const res = await fetchProducts();
      setProducts(res.data || []);
      setLoading(false);
    };
    
    loadProducts();
  }, [isAuthenticated]);

  // Cargar categorías
  const loadCategories = React.useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const cats = await fetchCategories();
      const categoryNames = cats.map((cat: any) => cat.name);
      setCategories(categoryNames);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      await loadCategories();
    })();
  }, [loadCategories]);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!isAuthenticated) return;
    const id = formState.id ? Number(formState.id) : null;
    const exists = id !== null && products.some(p => p.id === id);
    if (!formState.preparationTime || isNaN(Number(formState.preparationTime)) || Number(formState.preparationTime) <= 0) {
      setFormError('El tiempo de preparación es obligatorio y debe ser mayor a 0.');
      return;
    }
    const payload: Product = {
      id: id ?? undefined,
      name: formState.name,
      price: Number(formState.price),
      description: formState.description || '',
      image: formState.image || '',
      enabled: formState.enabled === 'true',
      category: formState.category || '',
      preparationTime: Number(formState.preparationTime)
    };
    if (!exists) {
      // Si es nuevo, asignar id
      const maxId = products.length > 0 ? Math.max(...products.map(p => Number(p.id) || 0)) : 0;
      payload.id = maxId + 1;
    }
    if (!exists) {
      const maxId = products.length > 0 ? Math.max(...products.map(p => Number(p.id) || 0)) : 0;
      payload.id = maxId + 1;
    }
    try {
      const result = await upsertProduct(exists ? id : null, payload as unknown as Record<string, unknown>);
      if (result && result.success) {
        setFormState({ id: '', name: '', price: '', description: '', image: '', enabled: 'true', category: '', preparationTime: '' });
        setFormError(null);
        setFormSuccess(`Producto "${payload.name}" guardado correctamente.`);
        load();
        setTimeout(() => setFormSuccess(null), 2500);
      } else {
        setFormError(result?.message || result?.error?.message || 'Error al guardar producto.');
        setFormSuccess(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar producto.';
      setFormError(errorMessage);
      setFormSuccess(null);
    }
  };


  const onToggle = async (id: number) => {
    if (!isAuthenticated) return;
    await toggleProduct(id);
    load();
  };

  const onDelete = async (id: number) => {
    if (!isAuthenticated) return;
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      try {
        await deleteProduct(id);
        load();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al eliminar producto.';
        alert(errorMessage);
      }
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen pl-64">
      {/* Crear/Editar Producto */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Crear/Editar Producto</h2>
        {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{formError}</div>}
        {formSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{formSuccess}</div>}
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre"
              value={formState.name}
              onChange={e => setFormState(f => ({...f, name: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <input
              type="number"
              placeholder="Precio"
              value={formState.price}
              onChange={e => setFormState(f => ({...f, price: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <select
              value={formState.category}
              onChange={e => setFormState(f => ({...f, category: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Tiempo de Preparación (min)"
              value={formState.preparationTime}
              onChange={e => setFormState(f => ({...f, preparationTime: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <textarea
              placeholder="Descripción"
              value={formState.description}
              onChange={e => setFormState(f => ({...f, description: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 md:col-span-2"
            ></textarea>
            <input
              type="text"
              placeholder="URL de Imagen"
              value={formState.image}
              onChange={e => setFormState(f => ({...f, image: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 md:col-span-2"
            />
            <select
              value={formState.enabled}
              onChange={e => setFormState(f => ({...f, enabled: e.target.value}))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="true">Habilitado</option>
              <option value="false">Deshabilitado</option>
            </select>
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Guardar Producto
            </button>
            {formState.id && (
              <button
                type="button"
                onClick={() => setFormState({ id: '', name: '', price: '', description: '', image: '', enabled: 'true', category: '', preparationTime: '' })}
                className="flex-1 bg-gray-400 text-white py-2 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
              >
                Cancelar Edición
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Productos Registrados */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-2">Productos Registrados ({products.length})</h3>
        <div className="overflow-x-auto max-h-[420px] bg-white rounded-xl shadow-md border border-green-100">
          <table className="min-w-full rounded-xl overflow-hidden font-sans text-[15px]">
            <thead className="bg-gradient-to-r from-green-50 to-blue-50 border-b-2 border-green-200">
              <tr>
                <th className="text-left p-4 font-bold text-gray-700">ID</th>
                <th className="text-left p-4 font-bold text-gray-700">Producto</th>
                <th className="text-left p-4 font-bold text-gray-700">Precio</th>
                <th className="text-left p-4 font-bold text-gray-700">Categoría</th>
                <th className="text-left p-4 font-bold text-gray-700">Tiempo Prep. (min)</th>
                <th className="text-left p-4 font-bold text-gray-700">Estado</th>
                <th className="text-center p-4 font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-500 border-solid"></div>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-600 font-mono text-sm">{p.id ?? '-'}</td>
                      <td className="p-4 text-gray-700 font-semibold">{p.name}</td>
                      <td className="p-4">
                        <span className="text-green-600 font-bold">
                          ${p.price?.toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {p.category || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700 font-semibold">{typeof p.preparationTime === 'number' ? p.preparationTime : '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          p.enabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {p.enabled ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-3 justify-center items-center">
                          <button
                            onClick={() => {
                              setFormState({
                                id: p.id?.toString() ?? '',
                                name: p.name ?? '',
                                price: p.price?.toString() ?? '',
                                description: p.description ?? '',
                                image: p.image ?? '',
                                enabled: p.enabled ? 'true' : 'false',
                                category: p.category ?? '',
                                preparationTime: p.preparationTime?.toString() ?? ''
                              });
                            }}
                            title="Editar"
                            className="p-2 rounded-full hover:bg-purple-100 text-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300"
                            style={{ fontSize: 0 }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path d="M17.211 6.293l-3.504-3.504a1 1 0 0 0-1.414 0l-8 8A1 1 0 0 0 4 12v3a1 1 0 0 0 1 1h3a1 1 0 0 0 .707-.293l8-8a1 1 0 0 0 0-1.414zM5 14v-2.586l7-7L15.586 7l-7 7H5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDelete(Number(p.id))}
                            title="Eliminar"
                            className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                            style={{ fontSize: 0 }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onToggle(Number(p.id))}
                            title={p.enabled ? 'Desactivar' : 'Activar'}
                            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 ${
                              p.enabled
                                ? 'hover:bg-red-100 text-red-500 focus:ring-red-200'
                                : 'hover:bg-green-100 text-green-600 focus:ring-green-200'
                            }`}
                            style={{ fontSize: 0 }}
                          >
                            {p.enabled ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <rect x="3" y="8" width="18" height="8" rx="4" fill="#fee2e2" stroke="#ef4444" />
                                <circle cx="8" cy="12" r="3" fill="#ef4444" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <rect x="3" y="8" width="18" height="8" rx="4" fill="#bbf7d0" stroke="#22c55e" />
                                <circle cx="16" cy="12" r="3" fill="#22c55e" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No hay productos registrados
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
