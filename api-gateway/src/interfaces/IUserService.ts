export interface User {
  id?: string;
  _id?: string;
  userId?: string;
  email: string;
  name?: string;
}

export interface UserResponse {
  success: boolean;
  data: User | null;
}

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
}

export interface IUserService {
  getUserByEmail(email: string): Promise<UserResponse>;
  getUserById(id: string): Promise<UserResponse>;
  updateUserPassword(id: string, password: string): Promise<UpdatePasswordResponse>;
}