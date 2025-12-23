import React, { useState, useEffect } from 'react';
import { adminLogin } from '../../services/adminService';
import { useAuth } from '../../store/auth';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { setAuth, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  console.log('🔍 Login component render - Current auth state:', { isAuthenticated, user });

  // ✅ Redirigir si ya está autenticado (para casos de recarga de página)
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 Already authenticated, redirecting...');
      const roles = user.roles || [];
      
      if (roles.includes('admin')) {
        navigate('/admin/dashboard', { replace: true });
      } else if (roles.includes('waiter')) {
        window.location.href = '/mesero';
      } else if (roles.includes('cook')) {
        window.location.href = '/cocina';
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, []); // Solo en mount

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Validar campos vacíos antes de llamar adminLogin
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa email y contraseña');
      return;
    }
    try {
      console.log('📤 Sending login request for:', email);
      const res = await adminLogin(email, password);
      console.log('📥 Login response:', { success: res.success, hasUser: !!res.user });
      
      if (res?.success) {
        console.log('✅ Login successful, setting auth...');
        const user = res.user;
        setAuth(user);
        console.log('✅ Auth set complete, redirecting immediately...');
        
        // ✅ Redirigir con un pequeño delay para asegurar que el estado se propague
        setTimeout(() => {
          const roles = user?.roles || [];
          if (roles.includes('admin')) {
            console.log('🔄 Redirecting admin to dashboard...');
            navigate('/admin/dashboard', { replace: true });
          } else if (roles.includes('waiter')) {
            console.log('🔄 Redirecting waiter...');
            window.location.href = '/mesero';
          } else if (roles.includes('cook')) {
            console.log('🔄 Redirecting cook...');
            window.location.href = '/cocina';
          } else {
            console.log('🔄 Default redirect to admin dashboard...');
            navigate('/admin/dashboard', { replace: true });
          }
        }, 100);
      } else {
        console.error('❌ Login failed: invalid credentials');
        setError('Credenciales inválidas');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-gradient-to-br from-[#232526] via-[#414345] to-[#232526]">
      {/* Lado decorativo */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[#232526] via-[#232526] to-[#414345] text-white p-12 relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <span className="bg-orange-500 rounded-lg p-2">
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-8 h-8'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 6v6l4 2' />
              <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='1.5' fill='none' />
            </svg>
          </span>
          <span className="font-bold text-2xl tracking-tight">Rápido y Sabroso</span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <h2 className="text-4xl font-extrabold mb-4">¡Bienvenido!</h2>
          <p className="text-lg text-gray-200 max-w-md text-center">Accede a la plataforma y gestiona tu restaurante de manera eficiente, rápida y segura.</p>
        </div>
        <div className="absolute bottom-8 left-8 text-xs text-gray-400">© {new Date().getFullYear()} Rápido y Sabroso</div>
      </div>
      {/* Lado formulario */}
      <div className="flex flex-1 justify-center items-center">
        <form onSubmit={onSubmit} className="bg-white/90 shadow-2xl rounded-2xl px-10 py-12 w-full max-w-md flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold text-neutral-800 mb-2 text-center">Bienvenido a Rápido y Sabroso</h1>
          {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
          <label htmlFor="email" className="block text-sm font-semibold text-neutral-700">Email</label>
          <input id="email" className="border border-neutral-300 rounded-lg p-3 w-full mb-2 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" value={email} onChange={e=>setEmail(e.target.value)} autoFocus />
          <label htmlFor="password" className="block text-sm font-semibold text-neutral-700">Contraseña</label>
          <div className="relative mb-4">
            <input              
              id="password"              
              type={showPassword ? 'text' : 'password'}
              className="border border-neutral-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-400 focus:border-transparent transition pr-12"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-orange-500 focus:outline-none"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-5.12M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.12 2.12A9.004 9.004 0 0012 5c-2.28 0-4.37.8-6.12 2.12M3 12c0 1.61.38 3.13 1.05 4.44M21 12c0-1.61-.38-3.13-1.05-4.44M9.88 9.88L3 3m0 0l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.12 2.12A9.004 9.004 0 0012 5c-2.28 0-4.37.8-6.12 2.12M3 12c0 1.61.38 3.13 1.05 4.44M21 12c0-1.61-.38-3.13-1.05-4.44" />
                </svg>
              )}
            </button>
          </div>
          <button className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 py-3 w-full font-bold text-lg transition-colors shadow">Entrar</button>
          <div className="text-center mt-2">
            <Link to="/recuperar" className="text-sm text-orange-700 hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;