from datetime import datetime
from typing import List
from decimal import Decimal

from pydantic import BaseModel, conint, confloat, field_validator


class OrderItem(BaseModel):
    productName: str
    quantity: conint(gt=0)        # cantidad > 0
    unitPrice: Decimal    

    @field_validator("unitPrice")
    @classmethod
    def unit_price_must_be_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("unitPrice must be non-negative")
        return v
    
    @property
    def subtotal(self) -> Decimal:
        """Calculate the subtotal for this item."""
        return Decimal(self.quantity) * self.unitPrice



class OrderIn(BaseModel):
    customerName: str
    table: str
    items: List[OrderItem]

    @field_validator("customerName")
    @classmethod
    def customer_name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("customerName must not be empty")
        return v.strip()

    @field_validator("items")
    @classmethod
    def items_must_not_be_empty(cls, v: List[OrderItem]) -> List[OrderItem]:
        if not v:
            raise ValueError("items must not be empty")
        return v



from typing import Literal

class OrderMessage(OrderIn):
    id: str
    createdAt: datetime
    status: Literal["pendiente", "preparando", "listo"] = "pendiente"
    
    @property
    def total(self) -> Decimal:
        """
        Calculate the total cost of the order with precise decimal arithmetic.
        
        Returns:
            Decimal: Sum of all item subtotals with financial precision.
        """
        return sum((item.subtotal for item in self.items), start=Decimal(0))
    
    @property
    def item_count(self) -> int:
        """Get the total number of items (sum of all quantities)."""
        return sum(item.quantity for item in self.items)
    
    @property
    def unique_products(self) -> int:
        """Get the count of unique products in the order."""
        return len(self.items)
    
    def get_item_by_product(self, product_name: str) -> OrderItem | None:
        """
        Find an item by product name.
        
        Args:
            product_name: The name of the product to find.
        
        Returns:
            The OrderItem if found, None otherwise.
        """
        return next((item for item in self.items if item.productName == product_name), None)
    
    def format_summary(self) -> str:
        """
        Generate a human-readable summary of the order.
        
        Returns:
            Formatted string with order details.
        """
        return (
            f"Order #{self.id[:8]} for {self.customerName} at {self.table}\n"
            f"Items: {self.item_count} ({self.unique_products} unique products)\n"
            f"Total: ${self.total:,.0f} COP\n"
            f"Status: {self.status}"
        )
