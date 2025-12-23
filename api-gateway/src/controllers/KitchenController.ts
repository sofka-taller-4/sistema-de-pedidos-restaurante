import { Request, Response, NextFunction } from 'express';
import { KitchenProxyService } from '../services/KitchenProxyService';
import { formatSuccessResponse } from '../utils/responseFormatter';
import { HTTP_STATUS } from '../config/constants';

const VALID_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed'];

// Controlador para operaciones de cocina
export class KitchenController {
  private proxyService: KitchenProxyService;

  constructor(proxyService: KitchenProxyService) {
    this.proxyService = proxyService;
  }

  /**
   * Valida si un estado es válido
   */
  private isValidStatus(status: string): boolean {
    return VALID_ORDER_STATUSES.includes(status);
  }

  /**
   * Construye la ruta de consulta con parámetros
   */
  private buildQueryPath(basePath: string, query: Record<string, any>): string {
    const qs = new URLSearchParams(query as Record<string, string>).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  /**
   * Valida el estado del pedido y devuelve error si es inválido
   */
  private validateOrderStatus(status: string, res: Response): boolean {
    if (!status || !this.isValidStatus(status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${VALID_ORDER_STATUSES.join(', ')}`,
      });
      return false;
    }
    return true;
  }

  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const path = this.buildQueryPath('/kitchen/orders', req.query as Record<string, any>);
      const response = await this.proxyService.forward(path, 'GET');
      
      res.status(HTTP_STATUS.OK).json(
        formatSuccessResponse(response.data)
      );
    } catch (error: any) {
      next(error);
    }
  };

  updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!this.validateOrderStatus(status, res)) {
        return;
      }

      const response = await this.proxyService.forward(
        `/kitchen/orders/${id}`,
        'PATCH',
        req.body
      );
      
      res.status(HTTP_STATUS.OK).json(
        formatSuccessResponse(response.data, 'Order status updated')
      );
    } catch (error: any) {
      next(error);
    }
  };

  updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const response = await this.proxyService.forward(
        `/kitchen/orders/${id}`,
        'PUT',
        req.body,
        req.headers as Record<string, string>
      );
      
      res.status(HTTP_STATUS.OK).json(
        formatSuccessResponse(response.data, 'Order updated successfully')
      );
    } catch (error: any) {
      next(error);
    }
  };
}