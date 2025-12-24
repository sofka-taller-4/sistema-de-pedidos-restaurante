import { IUserRepository } from '../interfaces/IUserRepository';
import { User, UpdatePasswordResponse } from '../interfaces/IUserService';
import { IProxyService } from '../interfaces/IProxyService';

export class UserRepository implements IUserRepository {
  constructor(private readonly adminProxy: IProxyService) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      const encodedEmail = encodeURIComponent(email);
      const response = await this.adminProxy.forward(`/admin/users/email/${encodedEmail}`, 'GET');
      return response.data;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const response = await this.adminProxy.forward(`/admin/users/${id}`, 'GET');
      return response.data;
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  async updatePassword(id: string, password: string): Promise<UpdatePasswordResponse> {
    const response = await this.adminProxy.forward(
      `/admin/users/${id}/password`, 
      'PUT', 
      { password }
    );
    return response.data;
  }
}