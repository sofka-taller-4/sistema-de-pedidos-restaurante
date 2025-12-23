import { formatCOP } from '../utils/currency';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Product } from '../types/order';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  quantity?: number;
}

// @ts-expect-error React component prop inference workaround
export default function ProductCard({ product, onAdd, quantity = 0 }: ProductCardProps) {
  return (
    <Card className="bg-gray-100 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      
      {/* Imagen (grande, casi toda la parte superior) */}
      <div className="relative w-full h-64 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="
            w-full 
            h-full 
            object-cover 
            p-2
            transition-transform 
            duration-300
            group-hover:scale-105
            rounded-3xl
          "
        />
      </div>

      {/* Información inferior */}
      <div className="px-4">
        <h3 className="font-semibold text-lg text-gray-900 truncate" data-testid="product-name">{product.name}</h3>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {formatCOP(product.price)}
          </span>

          <Button
            onClick={() => onAdd(product)}
            size="icon"
            className="w-12 h-12 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 shadow-md"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
