import bcrypt from 'bcryptjs';
import { Role } from './models';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function getDefaultRoles(roles?: Role[]): Role[] {
  return roles && roles.length > 0 ? roles : ['waiter'];
}

export async function createUserPayload({ name, email, password, roles }: { name: string, email: string, password: string, roles?: Role[] }) {
  return {
    name,
    email,
    passwordHash: await hashPassword(password),
    roles: getDefaultRoles(roles),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
