import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Images, Lock, X } from 'lucide-react';
import { Spinner } from '../components/ui';
import {
  DriveError,
  fetchPhotoUrl,
  folderIdFromUrl,
  getDriveToken,
  hasDriveToken,
  listPhotos,
  type DrivePhoto,
} from './driveApi';

/** Botón + galería a pantalla completa con las fotos de una carpeta de Drive, sin salir de la app. */
export default function PhotosButton({ url, title, className }: { url: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Images className="h-4 w-4" /> Ver fotos
      </button>
      {/* En un portal: así la galería ocupa toda la pantalla aunque el botón esté dentro de un
          contenedor con filtro/desenfoque (que haría que "fixed" se midiera contra ese contenedor). */}
      {open && createPortal(<Gallery url={url} title={title} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

type State =
  | { kind: 'ask' }
  | { kind: 'loading' }
  | { kind: 'ready'; token: string; photos: DrivePhoto[] }
  | { kind: 'error'; error: DriveError };

function Gallery({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const folderId = folderIdFromUrl(url);
  const [state, setState] = useState<State>(hasDriveToken() ? { kind: 'loading' } : { kind: 'ask' });
  const [index, setIndex] = useState<number | null>(null);

  const load = useCallback(
    async (prompt: boolean) => {
      if (!folderId) {
        setState({ kind: 'error', error: new DriveError('other', 'El enlace de la carpeta no es válido.') });
        return;
      }
      setState({ kind: 'loading' });
      try {
        const token = await getDriveToken(prompt);
        const photos = await listPhotos(folderId, token);
        setState({ kind: 'ready', token, photos });
      } catch (err) {
        setState({ kind: 'error', error: err instanceof DriveError ? err : new DriveError('other', 'No se pudieron cargar las fotos.') });
      }
    },
    [folderId],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Si ya hay permiso en esta sesión, carga directo (sin ventana emergente).
  useEffect(() => {
    if (hasDriveToken()) void load(false);
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (index === null ? onClose : () => setIndex(null))();
      if (state.kind === 'ready' && index !== null) {
        if (e.key === 'ArrowRight') setIndex((i) => (i === null ? i : (i + 1) % state.photos.length));
        if (e.key === 'ArrowLeft') setIndex((i) => (i === null ? i : (i - 1 + state.photos.length) % state.photos.length));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, state, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#020C1B] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Cerrar galería" className="rounded p-1 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">Fotos · {title}</h2>
          {state.kind === 'ready' && <p className="text-xs text-gray-400">{state.photos.length} foto{state.photos.length === 1 ? '' : 's'}</p>}
        </div>
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" /> Drive
        </a>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {state.kind === 'ask' && (
          <Centered>
            <Lock className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 font-medium">Permiso para ver las fotos</p>
            <p className="mt-1 max-w-xs text-sm text-gray-400">
              Google te pedirá una sola vez permiso de <strong>solo lectura</strong> en tu Drive para mostrar las fotos de
              esta misión aquí mismo. No se modifica nada.
            </p>
            <button type="button" onClick={() => void load(true)} className="mt-4 rounded-md bg-[#E63946] px-5 py-2.5 font-semibold">
              Autorizar y ver fotos
            </button>
          </Centered>
        )}

        {state.kind === 'loading' && (
          <Centered>
            <Spinner />
            <p className="mt-3 text-sm text-gray-400">Cargando fotos…</p>
          </Centered>
        )}

        {state.kind === 'error' && <ErrorView error={state.error} onRetry={() => void load(true)} url={url} />}

        {state.kind === 'ready' && state.photos.length === 0 && (
          <Centered>
            <p className="text-sm text-gray-400">Esta carpeta todavía no tiene fotos.</p>
          </Centered>
        )}

        {state.kind === 'ready' && state.photos.length > 0 && (
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {state.photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                className="aspect-square overflow-hidden rounded bg-white/5"
              >
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt={p.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-gray-500">{p.name}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {state.kind === 'ready' && index !== null && (
        <Lightbox photos={state.photos} token={state.token} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center text-center">{children}</div>;
}

function ErrorView({ error, onRetry, url }: { error: DriveError; onRetry: () => void; url: string }) {
  const help: Record<DriveError['code'], string> = {
    auth: 'Autoriza el acceso para ver las fotos.',
    'api-disabled': 'Falta activar la API de Google Drive en el proyecto (un paso de configuración, una sola vez).',
    'no-access': 'Esta cuenta no tiene permiso sobre la carpeta. Debe estar compartida con tu correo de Google.',
    network: 'Revisa tu conexión a internet.',
    other: '',
  };
  return (
    <Centered>
      <p className="font-medium">No se pudieron mostrar las fotos</p>
      <p className="mt-1 max-w-xs text-sm text-gray-300">{error.message}</p>
      {help[error.code] && <p className="mt-1 max-w-xs text-xs text-gray-400">{help[error.code]}</p>}
      {error.code === 'api-disabled' && (
        <a
          href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=taller-ss"
          target="_blank"
          rel="noreferrer"
          className="mt-3 text-sm text-[#E63946] underline"
        >
          Activar la API de Drive
        </a>
      )}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onRetry} className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Reintentar
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Abrir en Drive
        </a>
      </div>
    </Centered>
  );
}

function Lightbox({
  photos,
  token,
  index,
  onIndex,
  onClose,
}: {
  photos: DrivePhoto[];
  token: string;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const touchX = useRef<number | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    fetchPhotoUrl(photo.id, token)
      .then((u) => {
        urls.current.push(u);
        if (alive) setSrc(u);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [photo.id, token]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const step = (d: number) => onIndex((index + d + photos.length) % photos.length);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-sm text-gray-300">
        <span>
          {index + 1} / {photos.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Cerrar foto" className="rounded p-1 hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {!src && !failed && <Spinner />}
        {failed && <p className="text-sm text-gray-400">No se pudo cargar esta foto.</p>}
        {src && <img src={src} alt={photo.name} className="max-h-full max-w-full object-contain" />}
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Anterior" className="absolute left-2 rounded-full bg-black/50 p-2 hover:bg-black/70">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Siguiente" className="absolute right-2 rounded-full bg-black/50 p-2 hover:bg-black/70">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      <p className="truncate px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-gray-500">{photo.name}</p>
    </div>
  );
}
