import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

// DEMO: lee Drive con la sesión de Google de quien mira (permiso de solo lectura). Funciona para
// quien ya tiene la carpeta compartida con su cuenta. La versión definitiva usará una cuenta de
// servicio para que los clientes no necesiten acceso a Drive.

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const API = 'https://www.googleapis.com/drive/v3';

export interface DrivePhoto {
  id: string;
  name: string;
  mimeType: string;
  thumbnail: string | null;
  createdTime: string;
}

export type DriveErrorCode = 'auth' | 'api-disabled' | 'no-access' | 'network' | 'other';

export class DriveError extends Error {
  code: DriveErrorCode;
  constructor(code: DriveErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

let cached: { token: string; expires: number } | null = null;

/** Debe llamarse desde un clic del usuario (abre la ventana de permiso de Google). */
export async function getDriveToken(forcePrompt = false): Promise<string> {
  if (!forcePrompt && cached && cached.expires > Date.now() + 60_000) return cached.token;
  const provider = new GoogleAuthProvider();
  provider.addScope(SCOPE);
  const email = auth.currentUser?.email;
  provider.setCustomParameters(email ? { login_hint: email } : {});
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new DriveError('auth', 'Google no entregó el permiso de lectura.');
    cached = { token: credential.accessToken, expires: Date.now() + 55 * 60_000 };
    return credential.accessToken;
  } catch (err) {
    if (err instanceof DriveError) throw err;
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new DriveError('auth', 'Se canceló la autorización.');
    }
    if (code === 'auth/popup-blocked') throw new DriveError('auth', 'El navegador bloqueó la ventana de Google. Permítela e intenta de nuevo.');
    throw new DriveError('auth', `No se pudo autorizar el acceso a Drive (${code || 'error'}).`);
  }
}

export function hasDriveToken(): boolean {
  return !!cached && cached.expires > Date.now() + 60_000;
}

export function folderIdFromUrl(url: string): string | null {
  const m = /\/folders\/([\w-]{10,})/.exec(url) ?? /[?&]id=([\w-]{10,})/.exec(url);
  return m ? m[1] : null;
}

async function call(path: string, token: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  } catch {
    throw new DriveError('network', 'Sin conexión con Drive.');
  }
  if (res.ok) return res;
  const body = await res.json().catch(() => ({}));
  const reason: string = body?.error?.errors?.[0]?.reason ?? '';
  const message: string = body?.error?.message ?? '';
  if (res.status === 401) {
    cached = null;
    throw new DriveError('auth', 'La autorización venció. Vuelve a autorizar.');
  }
  if (res.status === 403 && (reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(message))) {
    throw new DriveError('api-disabled', 'La API de Google Drive no está activada en el proyecto.');
  }
  if (res.status === 403 || res.status === 404) {
    throw new DriveError('no-access', 'Tu cuenta no tiene acceso a esta carpeta de Drive.');
  }
  throw new DriveError('other', message || `Error de Drive (${res.status}).`);
}

/** Fotos (imágenes) de una carpeta, de la más antigua a la más nueva. */
export async function listPhotos(folderId: string, token: string): Promise<DrivePhoto[]> {
  const photos: DrivePhoto[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, createdTime)',
      pageSize: '200',
      orderBy: 'createdTime',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await call(`/files?${params}`, token);
    const data = await res.json();
    for (const f of data.files ?? []) {
      photos.push({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        // Las miniaturas de Drive traen el tamaño al final (=s220): se pide uno mayor.
        thumbnail: f.thumbnailLink ? String(f.thumbnailLink).replace(/=s\d+$/, '=s480') : null,
        createdTime: f.createdTime,
      });
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken && photos.length < 1000);
  return photos;
}

/** Foto completa como URL local (se pide con el permiso, no es pública). */
export async function fetchPhotoUrl(fileId: string, token: string): Promise<string> {
  const res = await call(`/files/${fileId}?alt=media&supportsAllDrives=true`, token);
  return URL.createObjectURL(await res.blob());
}
