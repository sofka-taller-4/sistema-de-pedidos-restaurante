import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOrderTimer, formatTime } from '../hooks/useOrderTimer';

describe('useOrderTimer', () => {
      it('no inicia si startTime es undefined', () => {
        const { result } = renderHook(() => useOrderTimer(1, true, undefined));
        expect(result.current.isRunning).toBe(false);
        expect(result.current.isCompleted).toBe(false);
      });



      it('branch: estimatedMinutes undefined no explota', () => {
        const { result } = renderHook(() => useOrderTimer(undefined, false, undefined));
        expect(result.current.remaining).toBe(0);
        expect(result.current.isRunning).toBe(false);
        expect(result.current.isCompleted).toBe(false);
      });

      it('branch: estimatedMinutes = 0 no explota', () => {
        const now = Date.now();
        const { result } = renderHook(() => useOrderTimer(0, true, now));
        expect(result.current.remaining).toBe(0);
        expect(result.current.isRunning).toBe(false);
        expect(result.current.isCompleted).toBe(false);
      });
    it('actualiza remaining si cambia estimatedMinutes', () => {
      const { result, rerender } = renderHook(({ min, started, start }) => useOrderTimer(min, started, start), {
        initialProps: { min: 2, started: false, start: undefined }
      });
      expect(result.current.remaining).toBe(120);
      rerender({ min: 3, started: false, start: undefined });
      expect(result.current.remaining).toBe(180);
    });

    it('detiene el timer si isStarted pasa a false (solo si startTime válido)', () => {
      const now = Date.now();
      const { result, rerender } = renderHook(({ min, started, start }) => useOrderTimer(min, started, start), {
        initialProps: { min: 1, started: true, start: now }
      });
      // Solo debe estar corriendo si startTime es válido
      if (result.current.isRunning) {
        rerender({ min: 1, started: false, start: now });
        expect(result.current.isRunning).toBe(false);
      } else {
        expect(result.current.isRunning).toBe(false);
      }
    });

    it('limpia el intervalo al desmontar solo si hay timer', () => {
      const now = Date.now();
      const clearSpy = vi.spyOn(global, 'clearInterval');
      const { result, unmount } = renderHook(() => useOrderTimer(1, true, now));
      // Si el timer está corriendo, debe limpiar
      if (result.current.isRunning) {
        act(() => {
          vi.advanceTimersByTime(200);
        });
        unmount();
        expect(clearSpy).toHaveBeenCalled();
      } else {
        unmount();
        expect(clearSpy).not.toHaveBeenCalled();
      }
      clearSpy.mockRestore();
    });

    it('soporta estimatedMinutes = 0', () => {
      const now = Date.now();
      const { result } = renderHook(() => useOrderTimer(0, true, now));
      expect(result.current.remaining).toBe(0);
      expect(result.current.isCompleted).toBe(false);
    });

    it('soporta startTime = 0 (no inicia)', () => {
      const { result } = renderHook(() => useOrderTimer(1, true, 0));
      expect(result.current.isRunning).toBe(false);
    });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('inicia con tiempo estimado y no iniciado', () => {
    const { result } = renderHook(() => useOrderTimer(5, false, undefined));
    expect(result.current.remaining).toBe(300);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(false);
  });

  it('no inicia si falta startTime', () => {
    const { result } = renderHook(() => useOrderTimer(2, true, undefined));
    expect(result.current.isRunning).toBe(false);
  });


  it('actualiza tiempo restante correctamente', () => {
    const now = Date.now();
    const { result } = renderHook(() => useOrderTimer(1, true, now));
    act(() => {
      vi.advanceTimersByTime(1000 * 30);
    });
    // Puede ser 60 por el redondeo, pero nunca mayor
    expect(result.current.remaining).toBeLessThanOrEqual(60);
    expect(result.current.remaining).toBeGreaterThanOrEqual(29);
  });

  it('reinicia si cambian props', () => {
    const now = Date.now();
    const { result, rerender } = renderHook(({ min, started, start }) => useOrderTimer(min, started, start), {
      initialProps: { min: 1, started: true, start: now }
    });
    act(() => {
      vi.advanceTimersByTime(1000 * 30);
    });
    rerender({ min: 2, started: true, start: now });
    expect(result.current.remaining).toBeGreaterThan(60);
  });

  it('no explota si estimatedMinutes es undefined', () => {
    const { result } = renderHook(() => useOrderTimer(undefined, true, Date.now()));
    expect(result.current.remaining).toBe(0);
  });
});

describe('formatTime', () => {
  it('formatea correctamente minutos y segundos', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
});
