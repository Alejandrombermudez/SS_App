import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, ChevronDown, FileUp } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ScreenHeader, Section, Spinner } from '../../components/ui';
import { formatCOP } from '../../utils/format';
import {
  buildPlan,
  batchSizeFor,
  COLLECTION_KEYS,
  COLLECTION_LABELS as LABELS,
  count,
  materialize,
  planWrites,
  type AccessExport,
  type CollectionKey,
  type ImportMode,
  type ImportPlan,
  type PlanItem,
  type WriteOp,
} from './importPlan';

// El catálogo se administra en la app ("Gestionar Servicios") y su numeración no coincide con la
// de Access: por defecto no se toca. El historial no depende de él (cada línea guarda su copia).
const DEFAULT_MODES: Record<CollectionKey, ImportMode> = {
  clients: 'all',
  vehicles: 'all',
  services: 'none',
  orders: 'all',
  professions: 'new',
  client_accounts: 'all',
};

type Stage = 'idle' | 'analyzing' | 'ready' | 'importing' | 'done' | 'error';

export default function ImportScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [exp, setExp] = useState<AccessExport | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [modes, setModes] = useState(DEFAULT_MODES);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<string[]>([]);

  async function load(json: unknown) {
    setMessage(null);
    const data = json as AccessExport;
    if (!data || !Array.isArray(data.orders) || !Array.isArray(data.clients)) {
      setStage('error');
      setMessage('El archivo no es una exportación de Access válida (ssm-export.json).');
      return;
    }
    setExp(data);
    setStage('analyzing');
    try {
      const [clients, vehicles, services, orders, professions, accounts, counter] = await Promise.all([
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'professions')),
        getDocs(collection(db, 'client_accounts')),
        getDoc(doc(db, 'counters', 'orders')),
      ]);
      const toMap = (snap: typeof clients) => new Map(snap.docs.map((d) => [d.id, d.data()]));
      setPlan(
        buildPlan(data, {
          clients: toMap(clients),
          vehicles: toMap(vehicles),
          services: toMap(services),
          orders: toMap(orders),
          professions: new Set(professions.docs.map((d) => String(d.data().name ?? '').trim().toLowerCase())),
          clientAccounts: toMap(accounts),
          counter: Number(counter.data()?.last) || 0,
        }),
      );
      setStage('ready');
    } catch (err) {
      console.error(err);
      setStage('error');
      setMessage('No se pudo leer Firestore para comparar. ¿Tienes permisos de administrador?');
    }
  }

  async function loadFile(file: File) {
    try {
      await load(JSON.parse(await file.text()));
    } catch {
      setStage('error');
      setMessage('No se pudo leer el archivo JSON.');
    }
  }

  async function loadDevExport() {
    const res = await fetch('/__dev/access-export.json');
    if (!res.ok) {
      setStage('error');
      setMessage('No hay exportación local. Ejecuta tools/access-export/export_access.py primero.');
      return;
    }
    await load(await res.json());
  }

  async function runImport() {
    if (!plan || !user?.email) return;
    const groups = planWrites(plan, modes, user.email.toLowerCase());
    const sdk = { serverTimestamp, fromDate: (d: Date) => Timestamp.fromDate(d) };
    const refOf = (op: WriteOp) => (op.id ? doc(db, op.collection, op.id) : doc(collection(db, op.collection)));

    const total = groups.reduce((n, [, ops]) => n + ops.length, 0);
    setProgress({ done: 0, total });
    setStage('importing');
    const summary: string[] = [];
    let done = 0;
    try {
      for (const [label, ops] of groups) {
        const size = batchSizeFor(ops[0]?.collection ?? '');
        for (let i = 0; i < ops.length; i += size) {
          const batch = writeBatch(db);
          for (const op of ops.slice(i, i + size)) {
            const data = materialize(op.data, sdk);
            if (op.merge) batch.set(refOf(op), data, { merge: true });
            else batch.set(refOf(op), data);
          }
          await batch.commit();
          done += Math.min(size, ops.length - i);
          setProgress({ done, total });
        }
        if (ops.length) summary.push(`${label}: ${ops.length} escrito${ops.length === 1 ? '' : 's'}`);
      }
      setResult(summary.length ? summary : ['No había nada que importar: todo estaba al día.']);
      setStage('done');
    } catch (err) {
      console.error(err);
      setResult(summary);
      setMessage(`La importación se detuvo (${(err as { code?: string }).code ?? 'error'}). Lo ya escrito se conserva; puedes volver a intentarlo.`);
      setStage('error');
    }
  }

  const pending = plan
    ? COLLECTION_KEYS.reduce(
        (n, k) => n + (modes[k] === 'none' ? 0 : count(plan[k], 'new')) + (modes[k] === 'all' ? count(plan[k], 'update') : 0),
        0,
      ) + (plan.counterTo !== null && modes.orders !== 'none' ? 1 : 0)
    : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Importar historial de Access" onBack={() => navigate('/settings')} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <Section title="1. Archivo de exportación">
          <div className="rounded-lg bg-[#112240] p-4 text-sm">
            <p className="text-gray-300">
              Genera el archivo en el computador donde está la base con{' '}
              <code className="rounded bg-black/40 px-1">tools/access-export/export_access.py</code>. Crea{' '}
              <code className="rounded bg-black/40 px-1">DB/export/ssm-export.json</code>.
            </p>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/30 py-4 hover:bg-white/5">
              <FileUp className="h-5 w-5" /> Elegir ssm-export.json
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void loadFile(e.target.files[0])}
              />
            </label>
            {import.meta.env.DEV && (
              <button type="button" onClick={() => void loadDevExport()} className="mt-2 w-full rounded-md bg-white/10 py-2 text-xs hover:bg-white/20">
                Cargar exportación local (solo en desarrollo)
              </button>
            )}
            {exp && (
              <p className="mt-3 text-xs text-gray-400">
                {exp.source} · exportado {exp.exported_at.replace('T', ' ')} · {exp.clients.length} clientes, {exp.vehicles.length}{' '}
                motos, {exp.services.length} servicios, {exp.orders.length} misiones
              </p>
            )}
          </div>
        </Section>

        {stage === 'analyzing' && (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-300">
            <Spinner className="h-5 w-5" /> Comparando con lo que ya hay en la app…
          </div>
        )}

        {message && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
          </p>
        )}

        {plan && exp && stage !== 'analyzing' && (
          <>
            <Section title="2. Vista previa">
              <div className="space-y-2">
                {COLLECTION_KEYS.map((k) => (
                  <CollectionRow
                    key={k}
                    label={LABELS[k]}
                    items={plan[k]}
                    mode={modes[k]}
                    onMode={(v) => setModes((s) => ({ ...s, [k]: v }))}
                    disabled={stage === 'importing' || stage === 'done'}
                  />
                ))}
              </div>

              {plan.totalsFixed.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-500/15 p-3 text-xs text-amber-100">
                  <p className="font-semibold">Totales corregidos al recalcular desde las líneas:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {plan.totalsFixed.map((t) => (
                      <li key={t.number}>
                        Misión Nº {t.number}: Access tenía {formatCOP(t.access)}, el cálculo da {formatCOP(t.computed)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.counterTo !== null && (
                <p className="mt-2 text-xs text-gray-400">Las próximas misiones creadas en la app empezarán en el Nº {plan.counterTo + 1}.</p>
              )}
              {exp.warnings.length > 0 && (
                <details className="mt-2 rounded-lg bg-[#112240] p-3 text-xs text-gray-300">
                  <summary className="cursor-pointer">{exp.warnings.length} avisos de la exportación</summary>
                  <ul className="mt-2 list-inside list-disc space-y-0.5">
                    {exp.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}
            </Section>

            <Section title="3. Importar">
              {stage === 'done' ? (
                <div className="rounded-lg bg-emerald-500/15 p-4 text-sm text-emerald-100">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5" /> Importación terminada
                  </p>
                  <ul className="mt-2 list-inside list-disc text-xs">
                    {result.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => navigate('/orders')} className="mt-3 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black">
                    Ver misiones
                  </button>
                </div>
              ) : stage === 'importing' ? (
                <div className="rounded-lg bg-[#112240] p-4 text-sm">
                  <p>
                    Escribiendo {progress.done} de {progress.total}…
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full bg-[#E63946] transition-all"
                      style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void runImport()}
                  disabled={pending === 0}
                  className="w-full rounded-md bg-[#E63946] py-3 font-semibold disabled:opacity-40"
                >
                  {pending === 0 ? 'Todo está al día' : `Importar ${pending} registro${pending === 1 ? '' : 's'}`}
                </button>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function CollectionRow({
  label,
  items,
  mode,
  onMode,
  disabled,
}: {
  label: string;
  items: PlanItem[];
  mode: ImportMode;
  onMode: (v: ImportMode) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const news = count(items, 'new');
  const updates = count(items, 'update');
  const conflicts = count(items, 'conflict');
  const interesting = items.filter((i) => i.kind !== 'same');

  return (
    <div className="rounded-lg bg-[#112240] p-3 text-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-xs text-emerald-300">{news} nuevos</span>
        <span className="text-xs text-amber-200">{updates} con cambios</span>
        <span className="text-xs text-gray-400">{count(items, 'same')} iguales</span>
        {conflicts > 0 && <span className="text-xs text-red-300">{conflicts} en conflicto</span>}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {(news > 0 || updates > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(
            [
              ['none', 'No importar'],
              ['new', 'Solo nuevos'],
              ['all', 'Nuevos y cambios'],
            ] as [ImportMode, string][]
          )
            .filter(([m]) => m !== 'all' || updates > 0)
            .map(([m, text]) => (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => onMode(m)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  mode === m ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
                }`}
              >
                {text}
              </button>
            ))}
        </div>
      )}
      {open && interesting.length > 0 && (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto border-t border-white/10 pt-2 text-xs">
          {interesting.map((i) => (
            <li key={i.id} className="flex gap-2">
              <span
                className={`shrink-0 ${i.kind === 'new' ? 'text-emerald-300' : i.kind === 'update' ? 'text-amber-200' : 'text-red-300'}`}
              >
                {i.kind === 'new' ? 'Nuevo' : i.kind === 'update' ? 'Cambia' : 'Conflicto'}
              </span>
              <span className="min-w-0 truncate text-gray-300">
                {i.label}
                {i.kind === 'update' && <span className="text-gray-500"> ({i.changes.join(', ')})</span>}
                {i.note && <span className="text-gray-500"> — {i.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
