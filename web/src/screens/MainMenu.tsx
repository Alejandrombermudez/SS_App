import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FilePlus2, LogOut, Settings, Users, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InstallPrompt from '../components/InstallPrompt';

export default function MainMenu() {
  const { role, user, signOutUser } = useAuth();
  const navigate = useNavigate();

  const title = role === 'admin' ? 'Panel de Administrador' : 'Estación de Trabajo';

  return (
    <div
      className="flex min-h-dvh flex-col items-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))]"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      <div className="flex w-full max-w-md items-center justify-between text-sm text-white/50">
        <span className="truncate">{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </div>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3">
        <img src="/brand/agente.png" alt="" className="mb-2 h-24 w-24" />
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">{title}</h1>

        <MenuButton primary icon={<FilePlus2 className="h-5 w-5" />} onClick={() => navigate('/orders/new')}>
          Nueva cotización
        </MenuButton>
        <MenuButton icon={<ClipboardList className="h-5 w-5" />} onClick={() => navigate('/orders')}>
          Misiones (órdenes y cotizaciones)
        </MenuButton>
        <MenuButton icon={<Users className="h-5 w-5" />} onClick={() => navigate('/clients')}>
          Clientes y vehículos
        </MenuButton>

        {role === 'admin' && (
          <>
            <MenuButton icon={<Wrench className="h-5 w-5" />} onClick={() => navigate('/services')}>
              Gestionar servicios
            </MenuButton>
            <MenuButton icon={<Settings className="h-5 w-5" />} onClick={() => navigate('/settings')}>
              Configuración
            </MenuButton>
          </>
        )}

        <div className="mt-6">
          <InstallPrompt />
        </div>
      </div>
    </div>
  );
}

function MenuButton({
  children,
  icon,
  onClick,
  primary = false,
}: {
  children: string;
  icon: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left font-medium text-white transition ${
        primary ? 'bg-[#E63946] hover:bg-[#d62f3c]' : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
