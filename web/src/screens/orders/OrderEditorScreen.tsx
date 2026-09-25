import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, FileText, Phone, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClient, useOrder, useServices, useVehicle } from '../../data/hooks';
import { deleteOrder, saveOrder } from '../../data/orderRepo';
import {
  ORDER_STATUSES,
  PART_TYPES,
  type Order,
  type OrderPartLine,
  type OrderServiceLine,
  type ServiceType,
} from '../../types';
import { computeTotals, groupBySection, lineTotal } from '../../utils/orderMath';
import { GROUP_OPTIONS } from '../../utils/serviceUtils';
import { calculateCategory, getCategoryColor } from '../../utils/vehicleUtils';
import { formatCOP, formatNumber, formatOrderNumber, SERVICE_TYPE_LABELS, todayIso } from '../../utils/format';
import { CenteredMessage, Plate, ScreenHeader, Section, Spinner, StatusChip } from '../../components/ui';
import ServicePickerDialog from './ServicePickerDialog';

const DISCOUNTS = [0, 5, 10, 15, 20, 50];

const fieldClass =
  'w-full rounded-md border border-gray-600 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white focus:outline-none';

export default function OrderEditorScreen() {
  const { id } = useParams();
  const number = Number.parseInt(id ?? '', 10) || null;
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const order = useOrder(number);
  const vehicle = useVehicle(order.data?.vehiclePlate ?? null);
  const client = useClient(order.data?.clientId ?? null);
  const catalog = useServices();

  const [draft, setDraft] = useState<Order | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const baseUpdatedAt = useRef<number | null>(null);

  // Mientras no haya cambios locales, la pantalla sigue en vivo lo que haya en Firestore.
  useEffect(() => {
    if (order.data && !dirty) {
      setDraft(order.data);
      baseUpdatedAt.current = order.data.updatedAt?.getTime() ?? null;
    }
  }, [order.data, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const totals = useMemo(
    () => (draft ? computeTotals(draft.services, draft.parts, draft.discountPct) : null),
    [draft],
  );

  if (order.loading || (order.data && !draft)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A192F]">
        <Spinner />
      </div>
    );
  }
  if (!order.data || !draft || !totals) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
        <ScreenHeader title="Misión" onBack={() => navigate('/orders')} />
        <CenteredMessage>{order.error ?? `La misión ${id} no existe.`}</CenteredMessage>
      </div>
    );
  }

  const remoteChanged =
    dirty && (order.data.updatedAt?.getTime() ?? null) !== baseUpdatedAt.current && order.data.updatedBy !== user?.email;
  const category = vehicle.data?.category || (vehicle.data ? calculateCategory(vehicle.data.cc) : draft.vehicleCategory);

  function update(patch: Partial<Order>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
    setSaveError(null);
  }

  function updateService(index: number, patch: Partial<OrderServiceLine>) {
    update({ services: draft!.services.map((l, i) => (i === index ? { ...l, ...patch } : l)) });
  }

  function updatePart(index: number, patch: Partial<OrderPartLine>) {
    update({ parts: draft!.parts.map((l, i) => (i === index ? { ...l, ...patch } : l)) });
  }

  async function save(): Promise<boolean> {
    if (!user?.email || !draft) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveOrder(draft, user.email.toLowerCase());
      setDraft(saved);
      setDirty(false);
      return true;
    } catch (err) {
      console.error(err);
      setSaveError('No se pudo guardar. Revisa la conexión e intenta de nuevo.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function leave(to: string) {
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    navigate(to);
  }

  async function openDocument() {
    if (dirty && !(await save())) return;
    navigate(`/orders/${draft!.number}/documento`);
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar la misión Nº ${formatOrderNumber(draft!.number)}? No se puede deshacer.`)) return;
    await deleteOrder(draft!.number);
    navigate('/orders', { replace: true });
  }

  const indexedServices = draft.services.map((l, index) => ({ ...l, index }));

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader
        title={`Misión Nº ${formatOrderNumber(draft.number)}`}
        subtitle={<StatusChip status={draft.status} />}
        onBack={() => leave('/orders')}
        actions={
          <>
            <button
              type="button"
              onClick={() => void openDocument()}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              <FileText className="h-4 w-4" /> Documento
            </button>
            {role === 'admin' && (
              <button type="button" onClick={() => void remove()} aria-label="Eliminar misión" className="rounded p-2 text-gray-400 hover:text-[#E63946]">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        }
      />

      {remoteChanged && (
        <div className="bg-amber-500/20 px-4 py-2 text-center text-xs text-amber-100">
          Otro agente ({order.data.updatedBy}) modificó esta misión.{' '}
          <button type="button" className="underline" onClick={() => setDirty(false)}>
            Descartar mis cambios y ver la suya
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-36 pt-4">
        {/* MOTO Y CLIENTE */}
        <div className="rounded-lg bg-[#112240] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Plate plate={draft.vehiclePlate} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {vehicle.data ? `${vehicle.data.brand} ${vehicle.data.line} ${vehicle.data.model}` : 'Moto no encontrada'}
              </p>
              <p className="flex items-center gap-2 text-xs text-gray-400">
                {vehicle.data?.cc && <span>{vehicle.data.cc} cc</span>}
                {category && (
                  <span className="rounded-full px-2 py-px font-bold text-black" style={{ backgroundColor: getCategoryColor(category) }}>
                    {category}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm">
            <span className="truncate">
              {client.data?.name ?? 'Cliente no encontrado'} <span className="text-gray-400">· CC {draft.clientId}</span>
            </span>
            {client.data?.phone && (
              <a href={`tel:${client.data.phone}`} className="flex items-center gap-1 text-[#E63946]">
                <Phone className="h-3.5 w-3.5" /> {client.data.phone}
              </a>
            )}
          </div>
        </div>

        {/* DATOS */}
        <Section title="Datos de la misión">
          <div className="space-y-3 rounded-lg bg-[#112240] p-4">
            <div>
              <Label>Tipo de documento</Label>
              <div className="grid grid-cols-2 gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update({ status: s })}
                    className={`rounded-md border py-2 text-sm font-medium ${
                      draft.status === s ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Tipo de servicio</Label>
              <div className="flex flex-wrap gap-2">
                {GROUP_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update({ serviceType: g as ServiceType })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      draft.serviceType === g ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    {SERVICE_TYPE_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label>Ingreso</Label>
                <input type="date" value={draft.entryDate} onChange={(e) => update({ entryDate: e.target.value })} className={fieldClass} />
              </div>
              <div>
                <Label>Salida</Label>
                {draft.exitDate ? (
                  <div className="relative">
                    <input type="date" value={draft.exitDate} onChange={(e) => update({ exitDate: e.target.value })} className={`${fieldClass} pr-8`} />
                    <button
                      type="button"
                      onClick={() => update({ exitDate: '' })}
                      aria-label="Quitar fecha de salida"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => update({ exitDate: todayIso() })} className={`${fieldClass} text-left text-gray-400`}>
                    Marcar hoy
                  </button>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Kilometraje</Label>
                <input
                  value={draft.km ? formatNumber(draft.km) : ''}
                  onChange={(e) => update({ km: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                  inputMode="numeric"
                  placeholder="0"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <Label>Observaciones iniciales</Label>
              <AutoTextarea
                value={draft.initialNotes}
                onChange={(v) => update({ initialNotes: v })}
                placeholder="Estado de la moto al ingresar, lo que reporta el cliente…"
              />
            </div>
          </div>
        </Section>

        {/* SERVICIOS */}
        <Section
          title={`Detalles de la misión · ${draft.services.length} servicio${draft.services.length === 1 ? '' : 's'}`}
          action={
            <button type="button" onClick={() => setShowPicker(true)} className="flex items-center gap-1 text-sm font-medium text-[#E63946]">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          }
        >
          {draft.services.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full rounded-lg border border-dashed border-white/20 py-8 text-sm text-gray-400 hover:bg-white/5"
            >
              Agrega servicios del catálogo
            </button>
          ) : (
            <div className="space-y-4">
              {groupBySection(indexedServices).map(([section, lines]) => (
                <div key={section}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">{section}</p>
                  <div className="space-y-2">
                    {lines.map((l) => (
                      <LineCard
                        key={`${l.itemCode}-${l.index}`}
                        badge={l.itemCode}
                        description={l.description}
                        quantity={l.quantity}
                        price={l.price}
                        onChange={(patch) => updateService(l.index, patch)}
                        onRemove={() => update({ services: draft.services.filter((_, i) => i !== l.index) })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* RECURSOS */}
        <Section
          title={`Recursos de la misión · ${draft.parts.length}`}
          action={
            <button
              type="button"
              onClick={() => update({ parts: [...draft.parts, { type: 'Repuesto', description: '', quantity: 1, price: 0, total: 0 }] })}
              className="flex items-center gap-1 text-sm font-medium text-[#E63946]"
            >
              <Plus className="h-4 w-4" /> Agregar
            </button>
          }
        >
          {draft.parts.length === 0 ? (
            <p className="rounded-lg bg-[#112240] p-4 text-sm text-gray-400">Repuestos, consumibles, insumos… sin descuento.</p>
          ) : (
            <div className="space-y-2">
              {draft.parts.map((p, i) => (
                <LineCard
                  key={i}
                  typeSelect={
                    <select
                      value={p.type}
                      onChange={(e) => updatePart(i, { type: e.target.value })}
                      className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                    >
                      {[...new Set([...PART_TYPES, p.type])].map((t) => (
                        <option key={t} value={t} className="bg-[#0A192F]">
                          {t}
                        </option>
                      ))}
                    </select>
                  }
                  description={p.description}
                  descriptionPlaceholder="Descripción del recurso"
                  quantity={p.quantity}
                  price={p.price}
                  onChange={(patch) => updatePart(i, patch)}
                  onRemove={() => update({ parts: draft.parts.filter((_, j) => j !== i) })}
                />
              ))}
            </div>
          )}
        </Section>

        {/* TOTALES */}
        <Section title="Liquidación">
          <div className="rounded-lg bg-[#112240] p-4 text-sm">
            <Row label="Subtotal de servicios" value={formatCOP(totals.subtotal)} />
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-gray-300">
                Descuento
                <select
                  value={draft.discountPct}
                  onChange={(e) => update({ discountPct: Number(e.target.value) })}
                  className="rounded bg-white/10 px-2 py-1 text-sm text-white"
                >
                  {[...new Set([...DISCOUNTS, draft.discountPct])].sort((a, b) => a - b).map((d) => (
                    <option key={d} value={d} className="bg-[#0A192F]">
                      {d}%
                    </option>
                  ))}
                </select>
              </span>
              <span className="text-[#ff8a93]">− {formatCOP(totals.discount)}</span>
            </div>
            <Row label="Total de servicios" value={formatCOP(totals.servicesTotal)} />
            <Row label="Total de recursos" value={formatCOP(totals.partsTotal)} />
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold">
              <span>Costo total de la misión</span>
              <span>{formatCOP(totals.total)}</span>
            </div>
            {draft.discountPct > 0 && (
              <p className="mt-2 text-xs text-gray-400">* El descuento aplica solo a servicios, no a recursos.</p>
            )}
          </div>
        </Section>

        <Section title="Observaciones finales">
          <AutoTextarea
            value={draft.finalNotes}
            onChange={(v) => update({ finalNotes: v })}
            placeholder="Trabajo realizado, recomendaciones, próximo mantenimiento…"
          />
        </Section>

        <p className="mt-6 text-center text-[11px] text-gray-500">
          {draft.source === 'access' ? 'Migrada desde Access · ' : ''}
          {draft.createdBy && `Creada por ${draft.createdBy}`}
          {draft.updatedBy && draft.updatedBy !== draft.createdBy && ` · Última edición: ${draft.updatedBy}`}
        </p>
      </main>

      {/* BARRA INFERIOR */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#020C1B]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Total</p>
            <p className="text-xl font-bold">{formatCOP(totals.total)}</p>
            {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          </div>
          {dirty ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-[#E63946] px-6 py-3 font-semibold disabled:opacity-60"
            >
              {saving && <Spinner className="h-4 w-4" />} Guardar
            </button>
          ) : (
            <span className="flex items-center gap-1 text-sm text-emerald-300">
              <Check className="h-4 w-4" /> Guardado
            </span>
          )}
        </div>
      </div>

      {showPicker && (
        <ServicePickerDialog
          catalog={catalog.data}
          category={category}
          serviceType={draft.serviceType}
          alreadyAdded={new Set(draft.services.map((l) => l.itemCode))}
          onDismiss={() => setShowPicker(false)}
          onAdd={(lines) => {
            update({ services: [...draft.services, ...lines], vehicleCategory: category });
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs text-gray-400">{children}</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-gray-300">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AutoTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      placeholder={placeholder}
      className={`${fieldClass} resize-none`}
    />
  );
}

function LineCard({
  badge,
  typeSelect,
  description,
  descriptionPlaceholder,
  quantity,
  price,
  onChange,
  onRemove,
}: {
  badge?: string;
  typeSelect?: ReactNode;
  description: string;
  descriptionPlaceholder?: string;
  quantity: number;
  price: number;
  onChange: (patch: { description?: string; quantity?: number; price?: number }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg bg-[#112240] p-3">
      <div className="flex items-start gap-2">
        {badge && <span className="mt-1 shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold">{badge}</span>}
        {typeSelect && <span className="mt-1 shrink-0">{typeSelect}</span>}
        <textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={1}
          placeholder={descriptionPlaceholder}
          className="min-h-[28px] flex-1 resize-none bg-transparent py-1 text-sm text-white placeholder:text-gray-500 focus:outline-none [field-sizing:content]"
        />
        <button type="button" onClick={onRemove} aria-label="Quitar" className="shrink-0 p-1 text-gray-500 hover:text-[#E63946]">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <input
          value={quantity}
          onChange={(e) => onChange({ quantity: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          inputMode="numeric"
          aria-label="Cantidad"
          className="w-12 rounded border border-gray-600 bg-black/30 px-2 py-1 text-center"
        />
        <span className="text-gray-500">×</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            value={price ? formatNumber(price) : ''}
            onChange={(e) => onChange({ price: Number(e.target.value.replace(/\D/g, '')) || 0 })}
            inputMode="numeric"
            placeholder="0"
            aria-label="Precio unitario"
            className="w-28 rounded border border-gray-600 bg-black/30 py-1 pl-5 pr-2 text-right"
          />
        </div>
        <span className="ml-auto font-semibold">{formatCOP(lineTotal(quantity, price))}</span>
      </div>
    </div>
  );
}
