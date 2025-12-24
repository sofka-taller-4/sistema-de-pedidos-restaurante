import { UserServiceFactory } from '../factories/UserServiceFactory';

// Instancia singleton del servicio refactorizado
const userService = UserServiceFactory.create();

// Funciones de compatibilidad que mantienen la API original
export async function getUserByEmail(email: string) {
  return await userService.getUserByEmail(email);
}

export async function getUserById(id: string) {
  return await userService.getUserById(id);
}

export async function updateUserPassword(id: string, password: string) {
  return await userService.updateUserPassword(id, password);
}
