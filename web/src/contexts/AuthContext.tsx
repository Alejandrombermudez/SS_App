import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, ADMIN_EMAILS } from '../firebase';
import type { UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Devuelve null cuando el usuario solo cerró la ventana (no es un error que mostrar).
function describeSignInError(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? 'desconocido';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e intenta de nuevo.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase (Authentication > Settings > Authorized domains).';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    default:
      return `No se pudo iniciar sesión (${code}).`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Rol leído de users/{correo}; undefined mientras llega el primer snapshot.
  const [staffRole, setStaffRole] = useState<UserRole | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const email = user?.email?.toLowerCase() ?? '';
  const isOwner = ADMIN_EMAILS.includes(email);

  // Mismo criterio que firestore.rules: dueño, o documento en users/ con su rol.
  // Se escucha en vivo para que quitar a alguien del personal le cierre el acceso de inmediato.
  useEffect(() => {
    if (!email || isOwner) {
      setStaffRole(undefined);
      return;
    }
    setStaffRole(undefined);
    return onSnapshot(
      doc(db, 'users', email),
      (snap) => {
        const r = snap.data()?.role;
        setStaffRole(r === 'admin' || r === 'staff' ? r : 'none');
      },
      () => setStaffRole('none'),
    );
  }, [email, isOwner]);

  const role: UserRole = !user ? 'none' : isOwner ? 'admin' : (staffRole ?? 'none');
  const loading = authLoading || (!!user && !isOwner && staffRole === undefined);

  async function signInWithGoogle() {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn('Google sign in failed', err);
      setError(describeSignInError(err));
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, error, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
