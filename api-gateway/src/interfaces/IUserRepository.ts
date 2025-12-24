import { User, UpdatePasswordResponse } from './IUserService';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updatePassword(id: string, password: string): Promise<UpdatePasswordResponse>;
}