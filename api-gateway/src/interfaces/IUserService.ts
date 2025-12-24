export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
}

export interface IUserService {
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUserPassword(id: string, password: string): Promise<UpdatePasswordResponse>;
}