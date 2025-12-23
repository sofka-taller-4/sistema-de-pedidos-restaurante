import { render, screen, fireEvent } from '@testing-library/react';
import { KitchenHeader } from '../components/KitchenHeader';



describe('KitchenHeader', () => {
  it('renderiza el título y la fecha actual por defecto', () => {
    render(<KitchenHeader />);
    expect(screen.getByText('Ordenes de Cocina')).toBeInTheDocument();
    // La fecha por defecto debe estar presente (formato español)
    const dateRegex = /\w+, \d+ de \w+ de \d{4}/i;
    expect(screen.getByText(dateRegex)).toBeInTheDocument();
  });

  it('muestra la fecha personalizada si se pasa como prop', () => {
    render(<KitchenHeader currentDate="lunes, 22 de diciembre de 2025" />);
    expect(screen.getByText('lunes, 22 de diciembre de 2025')).toBeInTheDocument();
  });

  it('muestra el email del usuario si se pasa como prop', () => {
    render(<KitchenHeader userEmail="chef@restaurante.com" />);
    expect(screen.getByText('chef@restaurante.com')).toBeInTheDocument();
  });

  it('no muestra el botón de cerrar sesión si no se pasa onLogout', () => {
    render(<KitchenHeader userEmail="chef@restaurante.com" />);
    expect(screen.queryByText('Cerrar Sesión')).not.toBeInTheDocument();
  });

  it('muestra el botón de cerrar sesión y llama onLogout al hacer click', () => {
    const onLogout = vi.fn();
    render(<KitchenHeader userEmail="chef@restaurante.com" onLogout={onLogout} />);
    const btn = screen.getByText('Cerrar Sesión');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onLogout).toHaveBeenCalled();
  });

  it('renderiza el input de búsqueda solo en md+ (siempre en el DOM)', () => {
    render(<KitchenHeader />);
    // El input existe aunque esté oculto en mobile
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
