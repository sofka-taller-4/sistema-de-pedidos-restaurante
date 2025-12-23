from datetime import datetime
from typing import List

from pydantic import BaseModel, conint, confloat, field_validator


class OrderItem(BaseModel):
    productName: str
    quantity: conint(gt=0)        # cantidad > 0
    unitPrice: confloat(ge=0)     # precio >= 0


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
    def total(self) -> float:
        """Calculate the total cost of the order."""
        return sum(item.quantity * item.unitPrice for item in self.items)
