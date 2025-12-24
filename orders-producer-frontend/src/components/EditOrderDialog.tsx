import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, Save, X } from 'lucide-react';
import type { ActiveOrder } from '../hooks/useActiveOrders';

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  note?: string | null;
}

interface Product {
  id: number;
  name: string;
  price: number;
  desc: string;
  image: string;
}

interface EditOrderDialogProps {
  order: ActiveOrder | null;
  open: boolean;
  onClose: () => void;
  onSave: (orderId: string, updates: {
    customerName: string;
    table: string;
    items: OrderItem[];
  }) => Promise<boolean>;
  availableProducts: Product[];
}

export function EditOrderDialog({ order, open, onClose, onSave, availableProducts }: EditOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [table, setTable] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when order changes
  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
      setTable(order.table || '');
      setItems(order.items || []);
    }
  }, [order]);

  const handleQuantityChange = (index: number, change: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const newQuantity = newItems[index].quantity + change;
      
      if (newQuantity <= 0) {
        // Remove item if quantity reaches 0
        return newItems.filter((_, i) => i !== index);
      }
      
      newItems[index] = {
        ...newItems[index],
        quantity: newQuantity
      };
      return newItems;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  const handleNoteChange = (index: number, note: string) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        note: note || null
      };
      return newItems;
    });
  };

  const handleAddProduct = (product: Product) => {
    setItems(prevItems => {
      // Check if product already exists in items
      const existingIndex = prevItems.findIndex(
        item => item.productName === product.name
      );

      if (existingIndex >= 0) {
        // Increment quantity if already exists
        const newItems = [...prevItems];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1
        };
        return newItems;
      } else {
        // Add new item
        return [...prevItems, {
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          note: null
        }];
      }
    });
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSave = async () => {
    if (!order || items.length === 0) return;

    // Validar que el nombre del cliente no esté vacío
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setError('Customer name is required');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const success = await onSave(order.fullId, {
        customerName: trimmedName,
        table: table.trim(),
        items
      });

      if (success) {
        onClose();
      } else {
        setError('Failed to save changes. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  if (!order) return null;

  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Edit Order {order.id}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name <span className="text-red-500">*</span></Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name (required)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">Table</Label>
              <Input
                id="table"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="Enter table number"
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Order Items</Label>
              <Badge variant="secondary" className="text-xs">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                No items in order. Add at least one item to save.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900">{item.productName}</h4>
                          <Badge variant="outline" className="text-xs">
                            ${item.unitPrice.toLocaleString()}
                          </Badge>
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(index, -1)}
                            className="h-8 w-8 p-0"
                            aria-label={`decrementar cantidad de ${item.productName}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold text-lg w-12 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(index, 1)}
                            className="h-8 w-8 p-0"
                            aria-label={`incrementar cantidad de ${item.productName}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-gray-600 ml-2">
                            Subtotal: ${(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        aria-label={`eliminar ${item.productName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Note Input */}
                    <div className="space-y-1">
                      <Label htmlFor={`note-${index}`} className="text-xs text-gray-600">
                        Special Instructions
                      </Label>
                      <Input
                        id={`note-${index}`}
                        value={item.note || ''}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                        placeholder="Add special instructions..."
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${total.toLocaleString()}
              </span>
            </div>
          )}

          {/* Add Products Section */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Add More Products</Label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {availableProducts.map((product) => {
                const existingItem = items.find(item => item.productName === product.name);
                const quantity = existingItem?.quantity || 0;
                
                return (
                  <div
                    key={product.id}
                    className="border rounded-lg p-3 flex items-center gap-3 hover:border-blue-300 transition-colors bg-white"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500">${product.price.toLocaleString()}</p>
                      {quantity > 0 && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          In order: {quantity}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProduct(product)}
                      className="shrink-0"
                      aria-label={`agregar ${product.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || items.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
