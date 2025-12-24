import * as UserService from '../../src/services/UserService';
import { AdminProxyService } from '../../src/services/AdminProxyService';

// Mock del AdminProxyService
jest.mock('../../src/services/AdminProxyService');

const MockedAdminProxyService = AdminProxyService as jest.MockedClass<typeof AdminProxyService>;

describe('UserService', () => {
  let mockAdminProxy: jest.Mocked<AdminProxyService>;

  beforeEach(() => {
    // Resetear mocks antes de cada test
    jest.clearAllMocks();
    
    // Crear mock instance
    mockAdminProxy = {
      forward: jest.fn(),
      getServiceName: jest.fn(),
      getBaseURL: jest.fn(),
    } as any;
    
    // Configurar el constructor mock para retornar nuestra instancia mock
    MockedAdminProxyService.mockImplementation(() => mockAdminProxy);
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
      
      mockAdminProxy.forward.mockResolvedValue(mockResponse);

      // Act
      const result = await getUserByEmail(email);

      // Assert
      expect(result).toEqual(expectedUserData);
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
        `/admin/users/email/${encodeURIComponent(email)}`,
        'GET'
      );
    });

    it('debe retornar null cuando la petición falla', async () => {
      // Arrange
      const email = 'test@example.com';
      mockAdminProxy.forward.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await getUserByEmail(email);

      // Assert
      expect(result).toBeNull();
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
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
      mockAdminProxy.forward.mockResolvedValue(mockResponse);

      // Act
      await getUserByEmail(email);

      // Assert
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
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
      
      mockAdminProxy.forward.mockResolvedValue(mockResponse);

      // Act
      const result = await getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUserData);
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
        `/admin/users/${userId}`,
        'GET'
      );
    });

    it('debe retornar null cuando la petición falla', async () => {
      // Arrange
      const userId = '123';
      mockAdminProxy.forward.mockRejectedValue(new Error('User not found'));

      // Act
      const result = await getUserById(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
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
      
      mockAdminProxy.forward.mockResolvedValue(mockResponse);

      // Act
      const result = await updateUserPassword(userId, newPassword);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
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
      
      mockAdminProxy.forward.mockRejectedValue(error);

      // Act & Assert
      await expect(updateUserPassword(userId, newPassword)).rejects.toThrow('Update failed');
      expect(mockAdminProxy.forward).toHaveBeenCalledWith(
        `/admin/users/${userId}/password`,
        'PUT',
        { password: newPassword }
      );
    });
  });
});