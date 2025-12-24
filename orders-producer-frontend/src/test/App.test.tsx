import { render, screen } from '@testing-library/react';
import App from '../App';
import React from 'react';

describe('App', () => {
  it('renderiza sin crashear', () => {
    render(<App />);
    // Busca algún texto global, ajusta si es necesario
    expect(screen.getByText(/restaurante|pedidos|panel|kitchen|waiter/i)).toBeInTheDocument();
  });
});
