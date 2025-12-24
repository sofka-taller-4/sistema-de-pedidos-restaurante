import { IUserService, User, UpdatePasswordResponse, UserResponse } from '../interfaces/IUserService';
import { IUserRepository } from '../interfaces/IUserRepository';

export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getUserByEmail(email: string): Promise<UserResponse> {
    this.validateEmail(email);
    
    try {
      const user = await this.userRepository.findByEmail(email);
      return {
        success: user !== null,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        data: null
      };
    }
  }

  async getUserById(id: string): Promise<UserResponse> {
    this.validateId(id);
    
    try {
      const user = await this.userRepository.findById(id);
      return {
        success: user !== null,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        data: null
      };
    }
  }

  async updateUserPassword(id: string, password: string): Promise<UpdatePasswordResponse> {
    this.validateId(id);
    this.validatePassword(password);
    return await this.userRepository.updatePassword(id, password);
  }

  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw new Error('Email is required and must be a non-empty string');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID is required and must be a non-empty string');
    }
  }

  private validatePassword(password: string): void {
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password is required and must be at least 6 characters long');
    }
  }
}