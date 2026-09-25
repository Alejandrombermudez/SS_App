import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';
import AccessDeniedScreen from '../screens/AccessDeniedScreen';

/** Personal del taller (dueños, admins o staff). Los clientes vuelven a su portal. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'none') return <AccessDeniedScreen />;
  if (role === 'client') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'none') return <AccessDeniedScreen />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Inicio: el menú del taller para el personal, el portal para los clientes. */
export function HomeRoute({ staff, client }: { staff: ReactNode; client: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'none') return <AccessDeniedScreen />;
  return <>{role === 'client' ? client : staff}</>;
}

/** Personal o cliente (el cliente solo puede abrir lo suyo: lo garantizan las reglas). */
export function AccountRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'none') return <AccessDeniedScreen />;
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
