import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

describe('usePageTitle', () => {
  const makeWrapper = (route: string) =>
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(MemoryRouter, { initialEntries: [route] }, children);
    }

  it('setea título por defecto', () => {
    renderHook(() => usePageTitle(), {
      wrapper: makeWrapper('/'),
    });
    expect(document.title).toBe('Rápido y Sabroso');
  });

  it('setea título para mesero', () => {
    renderHook(() => usePageTitle(), {
      wrapper: makeWrapper('/mesero'),
    });
    expect(document.title).toBe('Rápido y Sabroso - Mesero');
  });

  it('setea título para cocina', () => {
    renderHook(() => usePageTitle(), {
      wrapper: makeWrapper('/cocina'),
    });
    expect(document.title).toBe('Rápido y Sabroso - Cocina');
  });

  it('setea título para admin', () => {
    renderHook(() => usePageTitle(), {
      wrapper: makeWrapper('/admin'),
    });
    expect(document.title).toBe('Rápido y Sabroso - Admin');
  });

  it('setea título para login', () => {
    renderHook(() => usePageTitle(), {
      wrapper: makeWrapper('/login'),
    });
    expect(document.title).toBe('Rápido y Sabroso - Login');
  });
});
