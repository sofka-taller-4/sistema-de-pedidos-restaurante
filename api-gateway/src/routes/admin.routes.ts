import { Router } from 'express';
import { AdminProxyService } from '../services/AdminProxyService';
import { AdminController } from '../controllers/AdminController';
import { verifyJWT, requireRole } from '../middlewares/auth';

const router = Router();
const service = new AdminProxyService();
const controller = new AdminController(service);

// Login sin protección
router.post('/auth/login', controller.login);
router.post('/auth/logout', controller.logout);

// Productos activos (público - para meseros)
router.get('/products/active', controller.listActiveProducts);

// Categorías públicas (para meseros)
router.get('/categories/public/list', controller.listPublicCategories);

// Proteger todas las otras rutas
router.use(verifyJWT, requireRole('admin'));

// Usuarios
router.post('/users', controller.createUser);
router.get('/users', controller.listUsers);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);
router.patch('/users/:id/role', controller.updateUserRole);

// Productos
router.post('/products', controller.createProduct);
router.get('/products', controller.listProducts);
router.put('/products/:id', controller.updateProduct);
router.patch('/products/:id/toggle', controller.toggleProduct);
router.delete('/products/:id', controller.deleteProduct);

// Categorías
router.post('/categories', controller.createCategory);
router.get('/categories', controller.listCategories);
router.delete('/categories/:id', controller.deleteCategory);

// Dashboard
router.get('/dashboard/orders', controller.ordersSnapshot);
router.get('/dashboard/metrics', controller.metrics);

export default router;
