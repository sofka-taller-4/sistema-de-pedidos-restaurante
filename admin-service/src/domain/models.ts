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
  _id?: string;
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

export enum TableStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  RESERVED = 'Reserved'
}

export class Table {
  public id: string;
  public tableNumber: number;
  public capacity: number;
  public status: TableStatus;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(tableNumber: number, capacity: number) {
    this.id = this.generateId();
    this.tableNumber = tableNumber;
    this.capacity = capacity;
    this.status = TableStatus.AVAILABLE;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
