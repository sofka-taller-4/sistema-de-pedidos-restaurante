import { Request, Response, NextFunction } from 'express';
import { AdminProxyService } from '../services/AdminProxyService';
import { formatSuccessResponse } from '../utils/responseFormatter';
import { HTTP_STATUS } from '../config/constants';

export class AdminController {
	private proxy: AdminProxyService;
	constructor(proxy: AdminProxyService) { this.proxy = proxy; }

	// Categorías
	listCategories = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/categories', 'GET', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	listPublicCategories = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const r = await this.proxy.forward('/admin/categories/public/list', 'GET', undefined, {});
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	createCategory = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/categories', 'POST', req.body, headers);
			res.status(HTTP_STATUS.CREATED).json(r.data);
		} catch (e) { next(e); }
	};
	deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/categories/${req.params.id}`, 'DELETE', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};

	// Auth
	login = async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Security: Do not log request body as it contains credentials
			console.log('🔗 Proxy baseURL:', this.proxy.getBaseURL());
			const r = await this.proxy.forward('/admin/auth/login', 'POST', req.body, {});
			
			// ✅ CRÍTICO: Reenviar las cookies de autenticación al navegador
			const setCookieHeaders = r.headers['set-cookie'];
			if (setCookieHeaders) {
				if (Array.isArray(setCookieHeaders)) {
					setCookieHeaders.forEach((cookie: string) => {
						res.setHeader('Set-Cookie', cookie);
					});
				} else {
					res.setHeader('Set-Cookie', setCookieHeaders);
				}
				console.log('✅ Authentication cookies forwarded from admin service');
			}
			
			// Security: Do not log login response as it contains tokens
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) {
			console.error('❌ Login error:', e);
			next(e);
		}
	};

	logout = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/auth/logout', 'POST', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) {
			console.error('❌ Logout error:', e);
			next(e);
		}
	};

	refresh = async (req: Request, res: Response, next: NextFunction) => {
		try {
			// ✅ Obtener cookies del request
			const cookies = req.headers.cookie || '';
			
			console.log('🔄 Refresh token request received');
			console.log('🍪 Cookies present:', !!cookies);
			
			// ✅ Hacer proxy al admin service pasando las cookies
			const r = await this.proxy.forward('/admin/auth/refresh', 'POST', undefined, {
				cookie: cookies  // ✅ Importante: pasar cookies
			});
			
			// ✅ CRÍTICO: Reenviar las cookies de respuesta (nuevo accessToken)
			const setCookieHeaders = r.headers['set-cookie'];
			if (setCookieHeaders) {
				if (Array.isArray(setCookieHeaders)) {
					setCookieHeaders.forEach((cookie: string) => {
						res.setHeader('Set-Cookie', cookie);
					});
				} else {
					res.setHeader('Set-Cookie', setCookieHeaders);
				}
				console.log('✅ Set-Cookie headers forwarded from admin service');
			}
			
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e: any) {
			console.error('❌ Refresh error:', e.message);
			next(e);
		}
	};

	// Users
	createUser = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/users', 'POST', req.body, headers);
			res.status(HTTP_STATUS.CREATED).json(r.data);
		} catch (e) { next(e); }
	};
	listUsers = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const qs = new URLSearchParams(req.query as any).toString();
			const path = qs ? `/admin/users?${qs}` : '/admin/users';
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(path, 'GET', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	updateUser = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/users/${req.params.id}`, 'PUT', req.body, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/users/${req.params.id}/role`, 'PATCH', req.body, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	deleteUser = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/users/${req.params.id}`, 'DELETE', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};

	// Products
	createProduct = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/products', 'POST', req.body, headers);
			res.status(HTTP_STATUS.CREATED).json(r.data);
		} catch (e) { next(e); }
	};
	listProducts = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/products', 'GET', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	listActiveProducts = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const r = await this.proxy.forward('/admin/products/active', 'GET', undefined, {});
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	updateProduct = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/products/${req.params.id}`, 'PUT', req.body, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	toggleProduct = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/products/${req.params.id}/toggle`, 'PATCH', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward(`/admin/products/${req.params.id}`, 'DELETE', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};

	// Dashboard
	ordersSnapshot = async (req: Request, res: Response, next: NextFunction) => {
		try {
			// ✅ Extract JWT from cookies and add to Authorization header
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/dashboard/orders', 'GET', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};
	metrics = async (req: Request, res: Response, next: NextFunction) => {
		try {
			// ✅ Extract JWT from cookies and add to Authorization header
			const headers = this.getAuthHeaders(req);
			const r = await this.proxy.forward('/admin/dashboard/metrics', 'GET', undefined, headers);
			res.status(HTTP_STATUS.OK).json(r.data);
		} catch (e) { next(e); }
	};

	// ✅ Helper method to extract JWT from cookies and create Authorization header
	private getAuthHeaders(req: Request): Record<string, string> {
		const token = req.cookies?.accessToken;
		const headers: Record<string, string> = {};
		
		// ✅ Logging para debugging
		console.log('🍪 Extracting auth headers:', {
			hasCookies: !!req.cookies,
			hasAccessToken: !!token,
			allCookies: req.cookies ? Object.keys(req.cookies) : [],
			url: req.url
		});
		
		if (token) {
			headers.authorization = `Bearer ${token}`;
			console.log('✅ Authorization header added');
		} else {
			console.warn('⚠️ No accessToken found in cookies for:', req.url);
		}
		
		return headers;
	}
}
