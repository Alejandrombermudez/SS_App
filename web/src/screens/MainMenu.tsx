import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InstallPrompt from '../components/InstallPrompt';

export default function MainMenu() {
  const { role, user, signOutUser } = useAuth();
  const navigate = useNavigate();

  const title = role === 'admin' ? 'Panel de Administrador' : 'Estación de Trabajo';

  return (
    <div
      className="flex min-h-dvh flex-col items-center p-8"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      <div className="flex w-full max-w-md items-center justify-between text-sm text-white/50">
        <span>{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </div>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4">
        <h1 className="mb-8 text-center text-2xl font-semibold text-white">{title}</h1>

        <MenuButton onClick={() => alert('Próximamente: Crear Cotización')}>
          Crear Cotización
        </MenuButton>
        <MenuButton onClick={() => navigate('/clients')}>Buscar Cliente / Vehículos</MenuButton>

        {role === 'admin' && (
          <MenuButton onClick={() => navigate('/services')}>Gestionar Servicios</MenuButton>
        )}

        <div className="mt-8">
          <InstallPrompt />
        </div>
      </div>
    </div>
  );
}

function MenuButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md bg-white/10 px-4 py-3 font-medium text-white transition hover:bg-white/20"
    >
      {children}
    </button>
  );
}
