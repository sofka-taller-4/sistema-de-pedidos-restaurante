import { UserService } from '../services/UserServiceRefactored';
import { UserRepository } from '../repositories/UserRepository';
import { AdminProxyService } from '../services/AdminProxyService';
import { IUserService } from '../interfaces/IUserService';

export class UserServiceFactory {
  static create(): IUserService {
    const adminProxy = new AdminProxyService();
    const userRepository = new UserRepository(adminProxy);
    return new UserService(userRepository);
  }
}