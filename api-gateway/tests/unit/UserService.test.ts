// Mock del AdminProxyService antes de importar UserService
const mockForward = jest.fn();

jest.mock('../../src/services/AdminProxyService', () => {
  return {
    AdminProxyService: jest.fn().mockImplementation(() => ({
      forward: mockForward,
    })),
  };
});

import { getUserByEmail, getUserById, updateUserPassword } from '../../src/services/UserService';

describe('UserService', () => {
  beforeEach(() => {
    // Resetear mocks antes de cada test
    jest.clearAllMocks();
  });

  describe('getUserByEmail', () => {
    it('debe retornar datos del usuario cuando la petición es exitosa', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUserData = { id: '123', email: 'test@example.com', name: 'Test User' };
      const mockResponse = { 
        data: expectedUserData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };
      
      mockForward.mockResolvedValue(mockResponse);

      // Act
      const result = await getUserByEmail(email);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedUserData
      });
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/email/${encodeURIComponent(email)}`,
        'GET'
      );
    });

    it('debe retornar success false cuando la petición falla', async () => {
      // Arrange
      const email = 'test@example.com';
      mockForward.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await getUserByEmail(email);

      // Assert
      expect(result).toEqual({
        success: false,
        data: null
      });
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/email/${encodeURIComponent(email)}`,
        'GET'
      );
    });

    it('debe codificar correctamente emails con caracteres especiales', async () => {
      // Arrange
      const email = 'test+user@example.com';
      const mockResponse = { 
        data: { id: '123' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };
      mockForward.mockResolvedValue(mockResponse);

      // Act
      await getUserByEmail(email);

      // Assert
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/email/${encodeURIComponent(email)}`,
        'GET'
      );
    });
  });

  describe('getUserById', () => {
    it('debe retornar datos del usuario cuando la petición es exitosa', async () => {
      // Arrange
      const userId = '123';
      const expectedUserData = { id: '123', email: 'test@example.com', name: 'Test User' };
      const mockResponse = { 
        data: expectedUserData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };
      
      mockForward.mockResolvedValue(mockResponse);

      // Act
      const result = await getUserById(userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedUserData
      });
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/${userId}`,
        'GET'
      );
    });

    it('debe retornar success false cuando la petición falla', async () => {
      // Arrange
      const userId = '123';
      mockForward.mockRejectedValue(new Error('User not found'));

      // Act
      const result = await getUserById(userId);

      // Assert
      expect(result).toEqual({
        success: false,
        data: null
      });
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/${userId}`,
        'GET'
      );
    });
  });

  describe('updateUserPassword', () => {
    it('debe retornar datos actualizados cuando la petición es exitosa', async () => {
      // Arrange
      const userId = '123';
      const newPassword = 'newSecurePassword123';
      const expectedResponse = { success: true, message: 'Password updated' };
      const mockResponse = { 
        data: expectedResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };
      
      mockForward.mockResolvedValue(mockResponse);

      // Act
      const result = await updateUserPassword(userId, newPassword);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/${userId}/password`,
        'PUT',
        { password: newPassword }
      );
    });

    it('debe lanzar error cuando la petición falla', async () => {
      // Arrange
      const userId = '123';
      const newPassword = 'newPassword';
      const error = new Error('Update failed');
      
      mockForward.mockRejectedValue(error);

      // Act & Assert
      await expect(updateUserPassword(userId, newPassword)).rejects.toThrow('Update failed');
      expect(mockForward).toHaveBeenCalledWith(
        `/admin/users/${userId}/password`,
        'PUT',
        { password: newPassword }
      );
    });
  });
});