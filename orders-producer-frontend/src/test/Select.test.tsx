import { describe, it, expect, beforeAll } from 'vitest';
// Mock global scrollIntoView para Radix UI
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function () {};
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  Select,
  SelectGroup,
  SelectTrigger,
  SelectContent
} from '@/components/ui/select';
import * as SelectPrimitive from '@radix-ui/react-select';

describe('Select UI component', () => {
  it('renderiza SelectTrigger', () => {
    render(
      <Select>
        <SelectTrigger>Seleccionar</SelectTrigger>
        <SelectContent />
      </Select>
    );
    expect(screen.getByText('Seleccionar')).toBeInTheDocument();
  });

  it('aplica el tamaño correcto en SelectTrigger', () => {
    const { container } = render(
      <Select>
        <SelectTrigger size="sm">Pequeño</SelectTrigger>
        <SelectContent />
      </Select>
    );
    expect(container.querySelector('[data-size="sm"]')).toBeInTheDocument();
  });

  it('renderiza SelectContent, SelectGroup y SelectItem al abrir el menú', async () => {
    render(
      <Select>
        <SelectTrigger>Seleccionar</SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectPrimitive.Item value="opcion2">Opción 2</SelectPrimitive.Item>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    // Abrir el menú
    fireEvent.click(screen.getByText('Seleccionar'));
    // Esperar a que aparezcan los elementos
    await waitFor(() => {
      expect(document.querySelector('[data-slot="select-content"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="select-group"]')).toBeInTheDocument();
      expect(screen.getByText('Opción 2')).toBeInTheDocument();
    });
  });

  it('permite pasar className personalizado a SelectTrigger', () => {
    const { container } = render(
      <Select>
        <SelectTrigger className="custom-class">Custom</SelectTrigger>
        <SelectContent />
      </Select>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renderiza el ícono de flecha en SelectTrigger', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>Con icono</SelectTrigger>
        <SelectContent />
      </Select>
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
