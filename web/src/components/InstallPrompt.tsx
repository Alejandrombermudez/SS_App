import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ se identifica como Mac
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// Android/desktop Chrome y Edge exponen `beforeinstallprompt`; iOS Safari no tiene prompt
// y la instalación es manual (Compartir > Agregar a inicio), así que mostramos la instrucción.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          setDeferredPrompt(null);
        }}
        className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        <Download className="h-4 w-4" /> Instalar app
      </button>
    );
  }

  if (isIos()) {
    return (
      <p className="flex max-w-xs items-center justify-center gap-2 text-center text-xs text-white/60">
        <Share className="h-4 w-4 shrink-0" />
        <span>
          Para instalar la app: toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.
        </span>
      </p>
    );
  }

  return null;
}
