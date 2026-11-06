import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore';
import { AlertTriangle, Search, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAllOrders } from '../../data/allOrders';
import { useClients } from '../../data/hooks';
import Modal from '../../components/Modal';
import { CenteredMessage, Plate, ScreenHeader, Spinner, StatusChip } from '../../components/ui';
import type { Order } from '../../types';
import { formatCOP, formatDate, formatOrderNumber } from '../../utils/format';

type Filter = 'all' | 'deleted' | 'active';

/** Administración: todas las misiones y borrado DEFINITIVO (distinto de "Descartar", que es reversible). */
export default function PurgeOrdersScreen() {
  const navigate = useNavigate();
  const orders = useAllOrders();
  const clients = useClients();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('deleted');
  const [target, setTarget] = useState<Order | null>(null);

  const names = useMemo(() => new Map(clients.data.map((c) => [c.id, c.name])), [clients.data]);
  const visible = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return orders.data.filter((o) => {
      if (filter === 'deleted' && !o.deleted) return false;
      if (filter === 'active' && o.deleted) return false;
      const text = `${o.number} ${o.vehiclePlate} ${names.get(o.clientId) ?? ''} ${o.deletedReason}`.toLowerCase();
      return tokens.every((t) => text.includes(t));
    });
  }, [orders.data, filter, search, names]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Todas las misiones" subtitle="Borrado definitivo" onBack={() => navigate('/settings')} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-3">
        <div className="flex items-start gap-2 rounded-lg bg-red-500/15 p-3 text-xs text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Borrar aquí <strong>elimina la misión para siempre</strong>: desaparece del historial, de las finanzas y del
            portal del cliente, y no se puede recuperar. El número no se reutiliza. Para el día a día usa{' '}
            <strong>Descartar</strong> dentro de la misión, que se puede reabrir.
          </p>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Número, placa, cliente o razón"
            className="w-full rounded-md border border-gray-700 bg-black/30 py-2.5 pl-9 pr-3 text-sm placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {(
            [
              ['deleted', 'Eliminadas'],
              ['active', 'Activas'],
              ['all', 'Todas'],
            ] as [Filter, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === k ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'}`}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-400">{visible.length} misiones</span>
        </div>

        {orders.loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : orders.error ? (
          <CenteredMessage>{orders.error}</CenteredMessage>
        ) : visible.length === 0 ? (
          <CenteredMessage>No hay misiones con ese filtro.</CenteredMessage>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.map((o) => (
              <li key={o.number} className="flex items-center gap-3 rounded-lg bg-[#112240] p-3">
                <button type="button" onClick={() => navigate(`/orders/${o.number}`)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">Nº {formatOrderNumber(o.number)}</span>
                    <StatusChip status={o.status} deleted={o.deleted} />
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <Plate plate={o.vehiclePlate} size="sm" /> {names.get(o.clientId) ?? o.clientId} · {formatDate(o.entryDate)} · {formatCOP(o.total)}
                  </p>
                  {o.deleted && o.deletedReason && <p className="mt-1 truncate text-xs text-red-200">Razón: {o.deletedReason}</p>}
                </button>
                <button
                  type="button"
                  onClick={() => setTarget(o)}
                  aria-label={`Borrar definitivamente la misión ${o.number}`}
                  className="shrink-0 rounded-md border border-red-400/50 p-2 text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {target && <ConfirmPurge order={target} onClose={() => setTarget(null)} />}
    </div>
  );
}

function ConfirmPurge({ order, onClose }: { order: Order; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = typed.trim() === String(order.number);

  async function purge() {
    setBusy(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'orders', String(order.number)));
      onClose();
    } catch (err) {
      console.error(err);
      setError('No se pudo borrar. Solo un administrador puede hacerlo.');
      setBusy(false);
    }
  }

  return (
    <Modal onDismiss={busy ? () => undefined : onClose} maxWidthClassName="max-w-sm">
      <div className="p-5 text-white">
        <h3 className="text-lg font-bold">Borrar para siempre la misión Nº {formatOrderNumber(order.number)}</h3>
        <p className="mt-2 text-sm text-gray-300">
          {order.vehiclePlate} · {formatCOP(order.total)}. Esta acción <strong>no se puede deshacer</strong>.
        </p>
        <label className="mt-4 block text-xs text-gray-400" htmlFor="purge-confirm">
          Para confirmar, escribe el número de la misión: <strong className="text-white">{order.number}</strong>
        </label>
        <input
          id="purge-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          inputMode="numeric"
          autoFocus
          className="mt-1 w-full rounded-md border border-gray-600 bg-black/30 px-3 py-2 text-sm focus:border-white focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void purge()}
            disabled={!ok || busy}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {busy && <Spinner className="h-4 w-4" />} Borrar definitivamente
          </button>
        </div>
      </div>
    </Modal>
  );
}
