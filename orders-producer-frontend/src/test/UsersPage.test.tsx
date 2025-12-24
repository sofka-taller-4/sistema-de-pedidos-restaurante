import { render, fireEvent, waitFor } from '@testing-library/react';
import UsersPage from '../pages/admin/UsersPage';
import * as authStore from '../store/auth';
import * as adminService from '../services/adminService';
import React from 'react';

describe('UsersPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({}),
    })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const baseUser = {
    _id: 'u1',
    name: 'Juan Pérez',
    email: 'juan@test.com',
    roles: ['admin'],
    active: true,
    createdAt: '',
    updatedAt: ''
  };

  beforeEach(() => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: true });
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [] });
    vi.spyOn(adminService, 'createUser').mockResolvedValue({});
    vi.spyOn(adminService, 'updateUser').mockResolvedValue({});
    vi.spyOn(adminService, 'deleteUser').mockResolvedValue({});
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin crashear', async () => {
    const { findByText } = render(<UsersPage />);
    expect(await findByText(/Usuarios Registrados/i)).toBeInTheDocument();
  });

  it('renderiza usuarios existentes', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [baseUser] });
    const { findByText } = render(<UsersPage />);
    expect(await findByText('Juan Pérez')).toBeInTheDocument();
    expect(await findByText('juan@test.com')).toBeInTheDocument();
    expect(await findByText('👑 Admin')).toBeInTheDocument();
    expect(await findByText('✅ Activo')).toBeInTheDocument();
  });

  it('permite crear un usuario', async () => {
    const { findByPlaceholderText, findByText, container } = render(<UsersPage />);
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'Nuevo User' } });
    fireEvent.change(await findByPlaceholderText('Email'), { target: { value: 'nuevo@user.com' } });
    fireEvent.change(await findByPlaceholderText('Contraseña'), { target: { value: '123456' } });
    const saveBtn = await findByText('Crear Usuario');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      const successDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /creado exitosamente/i.test(div.textContent)
      );
      expect(successDiv).toBeInTheDocument();
    });
  });

  it('muestra error si la contraseña es corta', async () => {
    const { findByPlaceholderText, findByText, container } = render(<UsersPage />);
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'User' } });
    fireEvent.change(await findByPlaceholderText('Email'), { target: { value: 'user@x.com' } });
    fireEvent.change(await findByPlaceholderText('Contraseña'), { target: { value: '123' } });
    const saveBtn = await findByText('Crear Usuario');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      const errorDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /contraseña.*6 caracteres/i.test(div.textContent)
      );
      expect(errorDiv).toBeInTheDocument();
    });
  });

  it('permite abrir y cancelar el modal de edición', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [baseUser] });
    const { findByTitle, findByText, queryByText } = render(<UsersPage />);
    const editBtn = await findByTitle('Editar');
    fireEvent.click(editBtn);
    expect(await findByText('Editar Usuario')).toBeInTheDocument();
    const cancelBtn = await findByText('Cancelar');
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(queryByText('Editar Usuario')).not.toBeInTheDocument();
    });
  });

  it('permite editar un usuario exitosamente', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [baseUser] });
    const updateSpy = vi.spyOn(adminService, 'updateUser').mockResolvedValue({});
    const { findByTitle, findByText, findByDisplayValue } = render(<UsersPage />);
    const editBtn = await findByTitle('Editar');
    fireEvent.click(editBtn);
    expect(await findByText('Editar Usuario')).toBeInTheDocument();
    const nameInput = await findByDisplayValue('Juan Pérez');
    fireEvent.change(nameInput, { target: { value: 'Juan Editado' } });
    const saveBtn = await findByText('Guardar');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('u1', expect.objectContaining({ name: 'Juan Editado' }));
    });
  });

  it('muestra error al editar usuario (API falla)', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [baseUser] });
    vi.spyOn(adminService, 'updateUser').mockRejectedValue(new Error('Fallo update'));
    window.alert = vi.fn();
    const { findByTitle, findByText } = render(<UsersPage />);
    const editBtn = await findByTitle('Editar');
    fireEvent.click(editBtn);
    const saveBtn = await findByText('Guardar');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Error al actualizar usuario/));
    });
  });

  it('muestra error al crear usuario (API falla)', async () => {
    vi.spyOn(adminService, 'createUser').mockRejectedValue(new Error('Fallo create'));
    const { findByPlaceholderText, findByText, container } = render(<UsersPage />);
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'User' } });
    fireEvent.change(await findByPlaceholderText('Email'), { target: { value: 'user@x.com' } });
    fireEvent.change(await findByPlaceholderText('Contraseña'), { target: { value: '123456' } });
    const saveBtn = await findByText('Crear Usuario');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      const errorDiv = Array.from(container.querySelectorAll('div')).find(div =>
        div.textContent && /Error al crear usuario/i.test(div.textContent)
      );
      expect(errorDiv).toBeInTheDocument();
    });
  });

  it('permite cambiar el rol al crear usuario', async () => {
    const { findByPlaceholderText, findByText, container } = render(<UsersPage />);
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'User' } });
    fireEvent.change(await findByPlaceholderText('Email'), { target: { value: 'user@x.com' } });
    fireEvent.change(await findByPlaceholderText('Contraseña'), { target: { value: '123456' } });
    // Buscar el select por su clase y cambiar a 'Admin'
    const select = container.querySelector('select');
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'admin' } });
    const saveBtn = await findByText('Crear Usuario');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(adminService.createUser).toHaveBeenCalledWith(expect.objectContaining({ roles: ['admin'] }));
    });
  });

  it('no llama a createUser si no autenticado', async () => {
    vi.spyOn(authStore, 'useAuth').mockReturnValue({ isAuthenticated: false });
    const { findByPlaceholderText, findByText } = render(<UsersPage />);
    fireEvent.change(await findByPlaceholderText('Nombre'), { target: { value: 'User' } });
    fireEvent.change(await findByPlaceholderText('Email'), { target: { value: 'user@x.com' } });
    fireEvent.change(await findByPlaceholderText('Contraseña'), { target: { value: '123456' } });
    const saveBtn = await findByText('Crear Usuario');
    fireEvent.click(saveBtn);
    expect(adminService.createUser).not.toHaveBeenCalled();
  });

  it('permite eliminar un usuario', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [baseUser] });
    window.confirm = vi.fn(() => true);
    const { findByTitle } = render(<UsersPage />);
    const deleteBtn = await findByTitle('Eliminar');
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(adminService.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('permite activar/desactivar un usuario', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockResolvedValue({ data: [baseUser] });
    const { findByTitle } = render(<UsersPage />);
    const toggleBtn = await findByTitle('Desactivar');
    fireEvent.click(toggleBtn);
    expect(adminService.updateUser).toHaveBeenCalledWith('u1', { active: false });
  });

  it('muestra spinner de loading', async () => {
    vi.spyOn(adminService, 'fetchUsers').mockImplementation(() => new Promise(() => {}));
    const { container } = render(<UsersPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
