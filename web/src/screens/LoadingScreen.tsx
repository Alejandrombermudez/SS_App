import { Shield } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      <Shield className="h-16 w-16 animate-pulse text-white/40" strokeWidth={1.5} />
    </div>
  );
}
