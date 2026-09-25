import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AccessDeniedScreen() {
  const { user, signOutUser } = useAuth();

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-6 text-center text-white"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      <div className="max-w-sm">
        <ShieldAlert className="mx-auto h-16 w-16 text-[#E63946]" strokeWidth={1.5} />
        <h1 className="mt-4 text-xl font-semibold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-white/70">
          La cuenta <strong className="text-white">{user?.email}</strong> no está autorizada como agente del
          taller. Pídele a un administrador que te agregue en Configuración &gt; Personal.
        </p>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="mx-auto mt-6 flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" /> Usar otra cuenta
        </button>
      </div>
    </div>
  );
}
