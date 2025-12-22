export type Role = 'waiter' | 'cook' | 'admin';

export interface User {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  roles: Role[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  _id: string;
  id?: number; // optional numeric short id
  name: string;
  price: number;
  description: string;
  image: string;
  enabled: boolean;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RefreshToken {
  _id?: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
