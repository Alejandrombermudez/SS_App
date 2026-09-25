import { useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessSettings, useClient, useOrdersWhere, useVehiclesOf } from '../../data/hooks';
import { Plate, Spinner, StatusChip } from '../../components/ui';
import InstallPrompt from '../../components/InstallPrompt';
import type { Vehicle } from '../../types';
import { formatCOP, formatDate, formatNumber, formatOrderNumber } from '../../utils/format';
import { EXPIRY_LABEL, expiryState, type ExpiryState } from '../../utils/vehicleUtils';

/**
 * Portal del cliente: sus motos (con vencimientos) y sus misiones con el documento en PDF.
 * `previewOf` lo usa el personal para ver el portal tal como lo ve un cliente.
 */
export default function ClientPortal({ previewOf }: { previewOf?: string }) {
  const navigate = useNavigate();
  const { clientId: myClientId, user, signOutUser } = useAuth();
  const clientId = previewOf ?? myClientId;
  const client = useClient(clientId);
  const vehicles = useVehiclesOf(clientId);
  const orders = useOrdersWhere('client_id', clientId);
  const business = useBusinessSettings();

  const firstName = (client.data?.name ?? '').split(' ')[0];
  const phoneDigits = business.data.phone.replace(/\D/g, '');
  const whatsapp = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hola, soy ${client.data?.name ?? ''} (C.C. ${clientId ?? ''}).`)}`
    : '';

  return (
    <div
      className="flex min-h-dvh flex-col text-white"
      style={{ background: 'linear-gradient(180deg, #0A192F 0%, #020C1B 100%)' }}
    >
      {previewOf && (
        <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 text-xs text-amber-100">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="flex-1">Vista previa: así ve el portal {client.data?.name ?? 'el cliente'}.</span>
          <button type="button" onClick={() => navigate(-1)} className="font-semibold underline">
            Volver
          </button>
        </div>
      )}

      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <img src="/brand/agente.png" alt="" className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Servicio Secreto</p>
          <p className="font-serif text-lg font-black uppercase leading-none tracking-wide text-[#E63946]">Motorcycles</p>
        </div>
        {!previewOf && (
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Salir
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        {client.loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-semibold">{firstName ? `Hola, ${firstName}` : 'Hola'}</h1>
            <p className="text-sm text-white/60">{previewOf ? client.data?.email : user?.email}</p>

            {/* MOTOS */}
            <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-gray-400">Tus motos</h2>
            {vehicles.loading ? (
              <Spinner className="h-6 w-6" />
            ) : vehicles.data.length === 0 ? (
              <p className="text-sm text-gray-400">Aún no tienes motos registradas.</p>
            ) : (
              <div className="space-y-2">
                {vehicles.data.map((v) => (
                  <VehicleCard key={v.plate} vehicle={v} />
                ))}
              </div>
            )}

            {/* MISIONES */}
            <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-gray-400">Tus misiones</h2>
            {orders.loading ? (
              <Spinner className="h-6 w-6" />
            ) : orders.data.length === 0 ? (
              <p className="text-sm text-gray-400">Todavía no hay cotizaciones ni órdenes a tu nombre.</p>
            ) : (
              <ul className="space-y-2">
                {orders.data.map((o) => (
                  <li key={o.number}>
                    <button
                      type="button"
                      onClick={() => navigate(`/orders/${o.number}/documento`)}
                      className="flex w-full items-center gap-3 rounded-lg bg-[#112240] p-3 text-left hover:bg-[#15294d]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold">Nº {formatOrderNumber(o.number)}</span>
                          <StatusChip status={o.status} />
                        </div>
                        <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <Plate plate={o.vehiclePlate} size="sm" /> {formatDate(o.entryDate)}
                        </p>
                      </div>
                      <span className="font-bold">{formatCOP(o.total)}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-8 flex items-center justify-center gap-2 rounded-md bg-[#25D366] py-3 font-semibold text-black"
              >
                <MessageCircle className="h-5 w-5" /> Escríbenos por WhatsApp
              </a>
            )}

            {!previewOf && (
              <div className="mt-6 flex justify-center">
                <InstallPrompt />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  return (
    <div className="rounded-lg bg-[#112240] p-4">
      <div className="flex items-center gap-3">
        <Plate plate={v.plate} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {v.brand} {v.line} {v.model}
          </p>
          {v.km && <p className="text-xs text-gray-400">Último kilometraje: {formatNumber(v.km)} km</p>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Due label="SOAT" iso={v.soatDate} />
        <Due label="Tecnomecánica" iso={v.tecnoDate} />
      </div>
    </div>
  );
}

const DUE_STYLES: Record<ExpiryState, string> = {
  ok: 'bg-emerald-500/15 text-emerald-200',
  soon: 'bg-amber-500/20 text-amber-100',
  expired: 'bg-red-500/20 text-red-200',
  unknown: 'bg-white/5 text-gray-400',
};

function Due({ label, iso }: { label: string; iso: string }) {
  const state = expiryState(iso);
  return (
    <div className={`rounded-md px-3 py-2 ${DUE_STYLES[state]}`}>
      <p className="font-semibold">{label}</p>
      <p>{iso ? `Vence ${formatDate(iso)}` : 'Sin fecha registrada'}</p>
      {state !== 'unknown' && <p className="font-bold uppercase">{EXPIRY_LABEL[state]}</p>}
    </div>
  );
}
