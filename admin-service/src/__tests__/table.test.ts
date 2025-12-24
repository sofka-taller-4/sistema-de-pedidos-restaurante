import { Table, TableStatus } from '../domain/models';

describe('Table Creation', () => {
  describe('Basic Table Creation', () => {
    it('should create a table with valid table number and capacity', () => {
      // Arrange
      const tableNumber = 1;
      const capacity = 4;

      // Act
      const table = new Table(tableNumber, capacity);

      // Assert
      expect(table.tableNumber).toBe(tableNumber);
      expect(table.capacity).toBe(capacity);
      expect(table.status).toBe(TableStatus.AVAILABLE);
      expect(table.id).toBeDefined();
      expect(table.createdAt).toBeInstanceOf(Date);
      expect(table.updatedAt).toBeInstanceOf(Date);
    });
  });
});