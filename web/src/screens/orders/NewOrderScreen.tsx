import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, ChevronRight, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClients, useVehicle, useVehiclesOf } from '../../data/hooks';
import { createQuote } from '../../data/orderRepo';
import type { Client, ServiceType, Vehicle } from '../../types';
import { GROUP_OPTIONS } from '../../utils/serviceUtils';
import { SERVICE_TYPE_LABELS } from '../../utils/format';
import { CenteredMessage, Plate, ScreenHeader, Spinner } from '../../components/ui';

export default function NewOrderScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plateParam = params.get('plate');

  // Atajo desde la ficha de una moto: /orders/new?plate=ABC12D
  if (plateParam) return <CreateForPlate plate={plateParam} />;
  return <PickVehicle onBack={() => navigate(-1)} />;
}

function CreateForPlate({ plate }: { plate: string }) {
  const navigate = useNavigate();
  const vehicle = useVehicle(plate);
  if (vehicle.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A192F]">
        <Spinner />
      </div>
    );
  }
  if (!vehicle.data) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
        <ScreenHeader title="Nueva cotización" onBack={() => navigate(-1)} />
        <CenteredMessage>No se encontró la moto {plate}.</CenteredMessage>
      </div>
    );
  }
  return <ChooseServiceType vehicle={vehicle.data} onBack={() => navigate(-1)} />;
}

function PickVehicle({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const clients = useClients();
  const [search, setSearch] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const vehicles = useVehiclesOf(client?.id ?? null);

  const matches = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = tokens.length
      ? clients.data.filter((c) => tokens.every((t) => `${c.id} ${c.name} ${c.phone}`.toLowerCase().includes(t)))
      : clients.data;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es')).slice(0, 40);
  }, [clients.data, search]);

  // Si el cliente tiene una sola moto, se selecciona sola.
  useEffect(() => {
    if (client && !vehicles.loading && vehicles.data.length === 1) setVehicle(vehicles.data[0]);
  }, [client, vehicles.loading, vehicles.data]);

  if (vehicle) {
    // Si la moto se eligió sola (cliente con una sola moto), volver lleva a la lista de clientes.
    const back = () => {
      setVehicle(null);
      if (vehicles.data.length <= 1) setClient(null);
    };
    return <ChooseServiceType vehicle={vehicle} client={client} onBack={back} />;
  }

  if (client) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
        <ScreenHeader title="¿Qué moto?" subtitle={client.name} onBack={() => setClient(null)} />
        <main className="mx-auto w-full max-w-2xl flex-1 p-4">
          {vehicles.loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : vehicles.data.length === 0 ? (
            <CenteredMessage>
              Este cliente no tiene motos registradas. Agrégala desde Clientes y vehículos.
            </CenteredMessage>
          ) : (
            <ul className="space-y-2">
              {vehicles.data.map((v) => (
                <li key={v.plate}>
                  <button
                    type="button"
                    onClick={() => setVehicle(v)}
                    className="flex w-full items-center gap-3 rounded-lg bg-[#112240] p-4 text-left hover:bg-[#15294d]"
                  >
                    <Bike className="h-5 w-5 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <Plate plate={v.plate} size="sm" />
                      <p className="mt-1 truncate text-sm text-gray-300">
                        {v.brand} {v.line} {v.model}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Nueva cotización" subtitle="Elige el cliente" onBack={onBack} />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, cédula o teléfono"
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-black/30 py-2.5 pl-9 pr-3 text-sm placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="mt-3 flex items-center gap-2 text-sm text-[#E63946]"
        >
          <UserPlus className="h-4 w-4" /> ¿Cliente nuevo? Regístralo primero
        </button>

        {clients.loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setClient(c)}
                  className="flex w-full items-center gap-3 rounded-lg bg-[#112240] p-3 text-left hover:bg-[#15294d]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E63946] font-bold">
                    {c.name.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400">CC {c.id}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function ChooseServiceType({ vehicle, client, onBack }: { vehicle: Vehicle; client?: Client | null; onBack: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<ServiceType>('Especifico');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function create() {
    if (started.current || !user?.email) return;
    started.current = true;
    setCreating(true);
    setError(null);
    try {
      const number = await createQuote(vehicle, user.email.toLowerCase(), serviceType);
      navigate(`/orders/${number}`, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudo crear la cotización.');
      setCreating(false);
      started.current = false;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Nueva cotización" subtitle={client?.name} onBack={onBack} />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-[#112240] p-4">
          <Plate plate={vehicle.plate} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {vehicle.brand} {vehicle.line}
            </p>
            <p className="text-xs text-gray-400">
              {vehicle.model} · {vehicle.cc} cc · {vehicle.category || 'Sin categoría'}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-400">Tipo de servicio</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setServiceType(g as ServiceType)}
              className={`rounded-lg border px-3 py-3 text-sm font-medium ${
                serviceType === g ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-200'
              }`}
            >
              {SERVICE_TYPE_LABELS[g]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">Filtra el catálogo al agregar servicios. Lo puedes cambiar después.</p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={() => void create()}
          disabled={creating}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#E63946] py-3 font-semibold disabled:opacity-60"
        >
          {creating && <Spinner className="h-4 w-4" />}
          Crear cotización
        </button>
      </main>
    </div>
  );
}
