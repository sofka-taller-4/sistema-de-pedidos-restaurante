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

  private isValidStatus(status: string): boolean {
    return VALID_ORDER_STATUSES.includes(status);
  }

  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const path = qs ? `/kitchen/orders?${qs}` : '/kitchen/orders';
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
      if (!status || !this.isValidStatus(status)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${VALID_ORDER_STATUSES.join(', ')}`,
        });
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
      const response = await this.proxyService.forward(`/kitchen/orders/${id}`, 'PUT', req.body, req.headers as Record<string, string>);
      
      res.status(HTTP_STATUS.OK).json(
        formatSuccessResponse(response.data, 'Order updated successfully')
      );
    } catch (error: any) {
      next(error);
    }
  };
}