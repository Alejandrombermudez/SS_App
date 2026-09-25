import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Plus, Search, X } from 'lucide-react';
import { db } from '../../firebase';
import { orderFromData } from '../../firestoreConverters';
import { useClients } from '../../data/hooks';
import type { Order } from '../../types';
import { formatCOP, formatDate, formatOrderNumber } from '../../utils/format';
import { CenteredMessage, Plate, ScreenHeader, Spinner, StatusChip } from '../../components/ui';

const PAGE = 60;
type Filter = 'all' | 'Cotización' | 'Orden de Servicio';

export default function OrdersScreen() {
  const navigate = useNavigate();
  const [pageSize, setPageSize] = useState(PAGE);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const clients = useClients();

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'orders'), orderBy('number', 'desc'), limit(pageSize)),
      (snap) => {
        setOrders(snap.docs.map((d) => orderFromData(d.id, d.data())));
        setLoading(false);
      },
      () => {
        setError('No se pudieron cargar las misiones.');
        setLoading(false);
      },
    );
  }, [pageSize]);

  const clientNames = useMemo(() => new Map(clients.data.map((c) => [c.id, c.name])), [clients.data]);

  const visible = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (tokens.length === 0) return true;
      const text = `${o.number} ${formatOrderNumber(o.number)} ${o.vehiclePlate} ${clientNames.get(o.clientId) ?? ''}`.toLowerCase();
      return tokens.every((t) => text.includes(t));
    });
  }, [orders, filter, search, clientNames]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Misiones" subtitle="Cotizaciones y órdenes de servicio" onBack={() => navigate('/')} />

      <div className="mx-auto w-full max-w-3xl px-4 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, placa o cliente"
            className="w-full rounded-md border border-gray-700 bg-black/30 py-2.5 pl-9 pr-9 text-sm placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          {(
            [
              ['all', 'Todas'],
              ['Cotización', 'Cotizaciones'],
              ['Orden de Servicio', 'Órdenes'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                filter === key ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <CenteredMessage>{error}</CenteredMessage>
        ) : visible.length === 0 ? (
          <CenteredMessage>
            {orders.length === 0 ? 'Todavía no hay misiones registradas.' : 'Ninguna misión coincide con la búsqueda.'}
          </CenteredMessage>
        ) : (
          <ul className="space-y-2">
            {visible.map((o) => (
              <li key={o.number}>
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${o.number}`)}
                  className="flex w-full items-center gap-3 rounded-lg bg-[#112240] p-3 text-left hover:bg-[#15294d]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">Nº {formatOrderNumber(o.number)}</span>
                      <StatusChip status={o.status} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Plate plate={o.vehiclePlate} size="sm" />
                      <span className="truncate text-sm text-gray-300">{clientNames.get(o.clientId) ?? o.clientId}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">{formatCOP(o.total)}</p>
                    <p className="text-xs text-gray-400">{formatDate(o.entryDate)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && orders.length === pageSize && (
          <button
            type="button"
            onClick={() => setPageSize((n) => n + PAGE)}
            className="mt-4 w-full rounded-md border border-white/20 py-2.5 text-sm text-gray-300 hover:bg-white/5"
          >
            Ver misiones anteriores
          </button>
        )}
      </main>

      <button
        type="button"
        onClick={() => navigate('/orders/new')}
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 flex items-center gap-2 rounded-full bg-[#E63946] px-5 py-3.5 font-semibold text-white shadow-lg"
      >
        <Plus className="h-5 w-5" /> Nueva cotización
      </button>
    </div>
  );
}
