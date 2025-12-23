import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

describe('useWebSocket', () => {
  it('puede usarse sin crashear', () => {
    renderHook(() => useWebSocket('ws://localhost:1234'));
  });
});
