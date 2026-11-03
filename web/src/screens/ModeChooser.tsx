import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/** Para cuentas que son personal del taller y también clientes: elegir cómo entrar. */
export default function ModeChooser() {
  const { user, role, chooseMode, signOutUser } = useAuth();

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-6 text-white"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      <div className="w-full max-w-sm text-center">
        <img src="/brand/agente.png" alt="" className="mx-auto h-20 w-20" />
        <h1 className="mt-4 text-xl font-semibold">¿Cómo quieres entrar?</h1>
        <p className="mt-1 text-sm text-white/60">{user?.email}</p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => chooseMode('staff')}
            className="flex items-center gap-3 rounded-lg bg-[#E63946] px-4 py-4 text-left hover:bg-[#d62f3c]"
          >
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <span>
              <span className="block font-semibold">{role === 'admin' ? 'Administrador' : 'Personal del taller'}</span>
              <span className="block text-xs text-white/80">Cotizaciones, misiones, clientes y configuración</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => chooseMode('client')}
            className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-4 text-left hover:bg-white/20"
          >
            <UserRound className="h-6 w-6 shrink-0" />
            <span>
              <span className="block font-semibold">Cliente</span>
              <span className="block text-xs text-white/70">Mis motos, mis misiones, facturas y fotos</span>
            </span>
          </button>
        </div>

        <button type="button" onClick={() => void signOutUser()} className="mx-auto mt-6 flex items-center gap-1 text-sm text-white/50 hover:text-white">
          <LogOut className="h-4 w-4" /> Usar otra cuenta
        </button>
      </div>
    </div>
  );
}
