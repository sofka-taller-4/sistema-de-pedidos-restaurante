import os
os.environ["CLOUDAMQP_URL"] = "amqp://guest:guest@localhost:5672/"

# Mock de publish_order para evitar conexión real a RabbitMQ
from unittest.mock import patch
patcher = patch("app.messaging.messaging.publish_order", lambda order: None)
patcher.start()

import pytest
from app.models.order import OrderIn, OrderItem
from app.repositories.order_repository import InMemoryOrderRepository
from app.services.order_service import OrderService

@pytest.fixture(scope="session", autouse=True)
def stop_patcher():
    yield
    patcher.stop()

@pytest.fixture
def order_service():
    repo = InMemoryOrderRepository()
    return OrderService(repo)

@pytest.fixture
def sample_order_in():
    return OrderIn(
        customerName="Cliente Test",
        table="Mesa 1",
        items=[OrderItem(productName="Hamburguesa", quantity=2, unitPrice=10000)]
    )

def test_create_order(order_service, sample_order_in):
    order = order_service.create_order(sample_order_in)
    assert order.customerName == "Cliente Test"
    assert order.status == "pendiente"
    assert order.id is not None

def test_update_order_success(order_service, sample_order_in):
    order = order_service.create_order(sample_order_in)
    new_order_in = OrderIn(
        customerName="Cliente Editado",
        table="Mesa 2",
        items=[OrderItem(productName="Papas", quantity=1, unitPrice=5000)]
    )
    updated = order_service.update_order(order.id, new_order_in)
    assert updated.customerName == "Cliente Editado"
    assert updated.table == "Mesa 2"
    assert updated.status == "pendiente"

def test_update_order_preparing(order_service, sample_order_in):
    order = order_service.create_order(sample_order_in)
    # Simular cambio de estado a 'preparando'
    repo = order_service.repository
    order.status = "preparando"
    repo.update(order.id, order)
    new_order_in = OrderIn(
        customerName="No debe editar",
        table="Mesa X",
        items=[OrderItem(productName="Refresco", quantity=1, unitPrice=3000)]
    )
    with pytest.raises(PermissionError):
        order_service.update_order(order.id, new_order_in)

def test_update_order_not_found(order_service, sample_order_in):
    with pytest.raises(ValueError):
        order_service.update_order("no-existe", sample_order_in)

def test_create_order_with_empty_customer_name(order_service):
    """Test que valida que no se puede crear una orden con nombre vacío"""
    from pydantic import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        OrderIn(
            customerName="",
            table="Mesa 1",
            items=[OrderItem(productName="Hamburguesa", quantity=1, unitPrice=10000)]
        )
    assert "customerName must not be empty" in str(exc_info.value)

def test_create_order_with_whitespace_customer_name(order_service):
    """Test que valida que no se puede crear una orden con nombre solo de espacios"""
    from pydantic import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        OrderIn(
            customerName="   ",
            table="Mesa 1",
            items=[OrderItem(productName="Hamburguesa", quantity=1, unitPrice=10000)]
        )
    assert "customerName must not be empty" in str(exc_info.value)

def test_create_order_with_valid_customer_name_with_spaces(order_service):
    """Test que valida que se pueden crear órdenes con nombres que tienen espacios al inicio/final"""
    order_in = OrderIn(
        customerName="  Juan Pérez  ",
        table="Mesa 1",
        items=[OrderItem(productName="Hamburguesa", quantity=1, unitPrice=10000)]
    )
    # Debe recortar los espacios automáticamente
    assert order_in.customerName == "Juan Pérez"
    order = order_service.create_order(order_in)
    assert order.customerName == "Juan Pérez"

# ============================================================================
# MISSING COVERAGE TESTS
# ============================================================================

# Test 1: Verify get_order retrieves created orders
def test_get_order_returns_created_order(order_service, sample_order_in):
    """
    Test that verifies get_order can retrieve a previously created order.
    This ensures persistence is working correctly.
    """
    # Arrange
    created = order_service.create_order(sample_order_in)
    
    # Act
    retrieved = order_service.get_order(created.id)
    
    # Assert
    assert retrieved is not None, "Order should be retrievable after creation"
    assert retrieved.id == created.id
    assert retrieved.customerName == created.customerName
    assert retrieved.table == created.table
    assert len(retrieved.items) == len(created.items)


# Test 2: get_order returns None for non-existent order
def test_get_order_returns_none_for_invalid_id(order_service):
    """
    Test boundary condition: get_order should return None for non-existent IDs
    rather than raising an exception.
    """
    # Act
    result = order_service.get_order("non-existent-id-12345")
    
    # Assert
    assert result is None, "Should return None for non-existent order ID"


# Test 3: Validate items list is not empty
def test_create_order_with_empty_items_list_fails(order_service):
    """
    Business rule: Orders must have at least one item.
    This validates the model-level validation.
    """
    from pydantic import ValidationError
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        OrderIn(
            customerName="Juan",
            table="Mesa 1",
            items=[]  # Empty list - should fail
        )
    
    assert "items must not be empty" in str(exc_info.value)


# Test 4a: Validate quantity must be positive
def test_create_order_item_with_zero_quantity_fails():
    """
    Business rule: Item quantity must be greater than 0.
    Validates the conint(gt=0) constraint in OrderItem model.
    """
    from pydantic import ValidationError
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        OrderItem(productName="Pizza", quantity=0, unitPrice=10000)
    
    # Verify the error is about quantity constraint
    assert "quantity" in str(exc_info.value).lower()


# Test 4b: Validate quantity must be positive (negative case)
def test_create_order_item_with_negative_quantity_fails():
    """
    Business rule: Item quantity cannot be negative.
    Additional validation for conint(gt=0) constraint.
    """
    from pydantic import ValidationError
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        OrderItem(productName="Pizza", quantity=-5, unitPrice=10000)
    
    assert "quantity" in str(exc_info.value).lower()


# Test 4c: Validate price cannot be negative
def test_create_order_item_with_negative_price_fails():
    """
    Business rule: Item price cannot be negative.
    Validates the confloat(ge=0) constraint in OrderItem model.
    """
    from pydantic import ValidationError
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        OrderItem(productName="Pizza", quantity=1, unitPrice=-5000)
    
    assert "unitPrice" in str(exc_info.value).lower() or "price" in str(exc_info.value).lower()


# Test 4d: Validate price can be zero (edge case)
def test_create_order_item_with_zero_price_succeeds():
    """
    Edge case: Price of zero should be allowed (confloat(ge=0)).
    This might represent free items or promotional offers.
    """
    # Act
    item = OrderItem(productName="Promotional Item", quantity=1, unitPrice=0)
    
    # Assert
    assert item.unitPrice == 0
    assert item.quantity == 1


# Test 5: Update order preserves createdAt timestamp
def test_update_order_preserves_creation_timestamp(order_service, sample_order_in):
    """
    Verify that updating an order does not modify the original creation timestamp.
    This is an immutable field that should remain constant.
    """
    import time
    
    # Arrange
    original = order_service.create_order(sample_order_in)
    original_timestamp = original.createdAt
    
    # Act - Wait a moment to ensure different timestamp would be generated if not preserved
    time.sleep(0.01)
    new_order_in = OrderIn(
        customerName="Updated Name",
        table="Mesa 2",
        items=[OrderItem(productName="Pizza", quantity=3, unitPrice=15000)]
    )
    updated = order_service.update_order(original.id, new_order_in)
    
    # Assert
    assert updated.createdAt == original_timestamp, "createdAt should remain unchanged after update"
    assert updated.customerName == "Updated Name", "Other fields should be updated"
    assert updated.table == "Mesa 2"


# Test 5b: Multiple updates preserve original timestamp
def test_multiple_updates_preserve_original_timestamp(order_service, sample_order_in):
    """
    Extended test: Multiple consecutive updates should all preserve the original timestamp.
    """
    import time
    
    # Arrange
    original = order_service.create_order(sample_order_in)
    original_timestamp = original.createdAt
    
    # Act - Perform multiple updates
    for i in range(3):
        time.sleep(0.01)
        new_order_in = OrderIn(
            customerName=f"Updated Name {i}",
            table=f"Mesa {i}",
            items=[OrderItem(productName=f"Item{i}", quantity=1, unitPrice=5000)]
        )
        updated = order_service.update_order(original.id, new_order_in)
    
    # Assert
    assert updated.createdAt == original_timestamp, "createdAt should remain unchanged after multiple updates" 

# ============================================================================
# TDD approach
# ============================================================================

def test_order_total_single_item(order_service):
    """
    TDD RED: Calculate total for order with single item.
    Formula: quantity * unitPrice
    """
    # Arrange
    order_in = OrderIn(
        customerName="Test Customer",
        table="Mesa 1",
        items=[OrderItem(productName="Hamburguesa", quantity=2, unitPrice=15000)]
    )
    
    # Act
    order = order_service.create_order(order_in)
    
    # Assert
    expected_total = 2 * 15000  # 30000
    assert order.total == expected_total