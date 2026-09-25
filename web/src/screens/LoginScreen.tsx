import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InstallPrompt from '../components/InstallPrompt';

const LINES = [
  { x1: '0%', y1: '10%', x2: '80%', y2: '40%', width: 1, opacity: [0.3, 0.05] },
  { x1: '20%', y1: '0%', x2: '100%', y2: '20%', width: 2, opacity: [0.2, 0.1] },
  { x1: '0%', y1: '50%', x2: '70%', y2: '0%', width: 2.5, opacity: [0.6, 0.2] },
  { x1: '0%', y1: '20%', x2: '90%', y2: '50%', width: 1.5, opacity: [0.1, 0.4] },
  { x1: '0%', y1: '70%', x2: '100%', y2: '40%', width: 3, opacity: [0.1, 0.5] },
  { x1: '10%', y1: '100%', x2: '100%', y2: '80%', width: 2, opacity: [0.4, 0.05] },
];

function DecorativeLines() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {LINES.map((line, i) => (
          <linearGradient key={i} id={`login-line-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E63946" stopOpacity={line.opacity[0]} />
            <stop offset="100%" stopColor="#E63946" stopOpacity={line.opacity[1]} />
          </linearGradient>
        ))}
      </defs>
      {LINES.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={`url(#login-line-${i})`}
          strokeWidth={line.width}
        />
      ))}
    </svg>
  );
}

export default function LoginScreen() {
  const { signInWithGoogle, error, loading } = useAuth();

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      <DecorativeLines />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative flex h-[120px] w-[120px] items-center justify-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(230,57,70,0.4) 0%, transparent 70%)' }}
          />
          <Shield className="relative h-20 w-20 text-white/90" strokeWidth={1.5} />
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-white">
          Servicio Secreto de Motocicletas
        </h1>
        <p className="mt-2 text-white/70">Acceso exclusivo para agentes</p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-8 flex items-center gap-3 rounded-md bg-[#E63946]/90 px-6 py-3 font-medium text-white transition hover:bg-[#E63946] disabled:opacity-60"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.8-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.5 26.7 37.5 24 37.5c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 40.6 16.2 45 24 45z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.7 36 44 30.7 44 24c0-1.4-.1-2.8-.4-3.5z" />
          </svg>
          Ingresar con Google
        </button>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-8">
          <InstallPrompt />
        </div>
      </div>
    </div>
  );
}
