import { UserService } from '../../src/services/UserServiceRefactored';
import { IUserRepository } from '../../src/interfaces/IUserRepository';
import { User, UpdatePasswordResponse, UserResponse } from '../../src/interfaces/IUserService';

describe('UserServiceRefactored', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
    };
    
    userService = new UserService(mockUserRepository);
  });

  describe('getUserByEmail', () => {
    it('debe retornar usuario cuando el email es válido', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser: User = { id: '123', email, name: 'Test User' };
      mockUserRepository.findByEmail.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedUser
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
    });

    it('debe retornar success false cuando el usuario no existe', async () => {
      // Arrange
      const email = 'test@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).toEqual({
        success: false,
        data: null
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
    });

    it('debe lanzar error cuando el email está vacío', async () => {
      // Act & Assert
      await expect(userService.getUserByEmail('')).rejects.toThrow('Email is required and must be a non-empty string');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando el email es null', async () => {
      // Act & Assert
      await expect(userService.getUserByEmail(null as any)).rejects.toThrow('Email is required and must be a non-empty string');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando el email tiene formato inválido', async () => {
      // Act & Assert
      await expect(userService.getUserByEmail('invalid-email')).rejects.toThrow('Invalid email format');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('debe aceptar emails con formato válido', async () => {
      // Arrange
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ];
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      for (const email of validEmails) {
        await userService.getUserByEmail(email);
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      }
    });

    it('debe retornar success false cuando hay error en el repositorio', async () => {
      // Arrange
      const email = 'test@example.com';
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).toEqual({
        success: false,
        data: null
      });
    });
  });

  describe('getUserById', () => {
    it('debe retornar usuario cuando el ID es válido', async () => {
      // Arrange
      const id = '123';
      const expectedUser: User = { id, email: 'test@example.com', name: 'Test User' };
      mockUserRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserById(id);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedUser
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(id);
    });

    it('debe retornar success false cuando el usuario no existe', async () => {
      // Arrange
      const id = '123';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(id);

      // Assert
      expect(result).toEqual({
        success: false,
        data: null
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(id);
    });

    it('debe lanzar error cuando el ID está vacío', async () => {
      // Act & Assert
      await expect(userService.getUserById('')).rejects.toThrow('ID is required and must be a non-empty string');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando el ID es null', async () => {
      // Act & Assert
      await expect(userService.getUserById(null as any)).rejects.toThrow('ID is required and must be a non-empty string');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando el ID solo contiene espacios', async () => {
      // Act & Assert
      await expect(userService.getUserById('   ')).rejects.toThrow('ID is required and must be a non-empty string');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('debe retornar success false cuando hay error en el repositorio', async () => {
      // Arrange
      const id = '123';
      mockUserRepository.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await userService.getUserById(id);

      // Assert
      expect(result).toEqual({
        success: false,
        data: null
      });
    });
  });

  describe('updateUserPassword', () => {
    it('debe actualizar contraseña cuando los parámetros son válidos', async () => {
      // Arrange
      const id = '123';
      const password = 'newPassword123';
      const expectedResponse: UpdatePasswordResponse = { success: true, message: 'Password updated' };
      mockUserRepository.updatePassword.mockResolvedValue(expectedResponse);

      // Act
      const result = await userService.updateUserPassword(id, password);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(id, password);
    });

    it('debe lanzar error cuando el ID está vacío', async () => {
      // Act & Assert
      await expect(userService.updateUserPassword('', 'password123')).rejects.toThrow('ID is required and must be a non-empty string');
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando la contraseña está vacía', async () => {
      // Act & Assert
      await expect(userService.updateUserPassword('123', '')).rejects.toThrow('Password is required and must be at least 6 characters long');
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando la contraseña es muy corta', async () => {
      // Act & Assert
      await expect(userService.updateUserPassword('123', '12345')).rejects.toThrow('Password is required and must be at least 6 characters long');
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando la contraseña es null', async () => {
      // Act & Assert
      await expect(userService.updateUserPassword('123', null as any)).rejects.toThrow('Password is required and must be at least 6 characters long');
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('debe aceptar contraseñas de 6 caracteres o más', async () => {
      // Arrange
      const id = '123';
      const validPasswords = ['123456', 'password123', 'very-long-password'];
      const expectedResponse: UpdatePasswordResponse = { success: true, message: 'Password updated' };
      mockUserRepository.updatePassword.mockResolvedValue(expectedResponse);

      // Act & Assert
      for (const password of validPasswords) {
        await userService.updateUserPassword(id, password);
        expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(id, password);
      }
    });
  });
});