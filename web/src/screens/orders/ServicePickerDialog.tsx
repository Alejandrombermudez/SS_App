import { useMemo, useState } from 'react';
import { Check, Link2, Search, X } from 'lucide-react';
import type { OrderServiceLine, Service } from '../../types';
import { CATEGORY_MULTIPLIER, isVariable, priceForCategory, serviceLineFromCatalog } from '../../utils/orderMath';
import { GROUP_OPTIONS } from '../../utils/serviceUtils';
import { formatCOP, SERVICE_TYPE_LABELS } from '../../utils/format';

interface Props {
  catalog: Service[];
  category: string;
  serviceType: string;
  alreadyAdded: Set<string>;
  onDismiss: () => void;
  onAdd: (lines: OrderServiceLine[]) => void;
}

export default function ServicePickerDialog({ catalog, category, serviceType, alreadyAdded, onDismiss, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(serviceType);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const byCode = useMemo(() => new Map(catalog.map((s) => [s.itemCode, s])), [catalog]);
  const multiplier = CATEGORY_MULTIPLIER[category] ?? null;

  const grouped = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = catalog.filter((s) => {
      // Igual que Access: GRUPO SERVICIO Like "*tipo*"
      if (group && !s.serviceGroup.toLowerCase().includes(group.toLowerCase())) return false;
      if (tokens.length === 0) return true;
      const text = `${s.itemCode} ${s.description} ${s.section}`.toLowerCase();
      return tokens.every((t) => text.includes(t));
    });
    const map = new Map<string, Service[]>();
    for (const s of list) map.set(s.section, [...(map.get(s.section) ?? []), s]);
    return [...map.entries()];
  }, [catalog, search, group]);

  function toggle(service: Service) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(service.itemCode)) {
        next.delete(service.itemCode);
      } else {
        next.add(service.itemCode);
        // Al elegir un servicio se marcan también sus dependencias (se pueden desmarcar).
        for (const dep of service.dependencies) {
          if (byCode.has(dep) && !alreadyAdded.has(dep)) next.add(dep);
        }
      }
      return next;
    });
  }

  const selectedServices = [...selected].map((code) => byCode.get(code)).filter((s): s is Service => !!s);
  const selectedTotal = multiplier === null ? null : selectedServices.reduce((sum, s) => sum + priceForCategory(s, category), 0);

  function confirm() {
    const lines = selectedServices
      .sort((a, b) => (Number.parseInt(a.itemCode, 10) || 0) - (Number.parseInt(b.itemCode, 10) || 0))
      .map((s) => serviceLineFromCatalog(s, category));
    onAdd(lines);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4" onClick={onDismiss}>
      <div
        className="flex h-full w-full flex-col bg-[#0F1E36] text-white sm:h-[85vh] sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button type="button" onClick={onDismiss} aria-label="Cerrar" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Agregar servicios</h2>
            <p className="text-xs text-gray-400">
              {multiplier === null
                ? 'La moto no tiene categoría: asígnala para calcular los servicios variables.'
                : `Precios para categoría ${category} (variables ×${multiplier})`}
            </p>
          </div>
        </div>

        <div className="border-b border-white/10 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar servicio, código o sección"
              className="w-full rounded-md border border-gray-700 bg-black/30 py-2 pl-9 pr-3 text-sm placeholder:text-gray-500 focus:border-white focus:outline-none"
            />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {[null, ...GROUP_OPTIONS].map((g) => (
              <button
                key={g ?? 'all'}
                type="button"
                onClick={() => setGroup(g)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                  group === g ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
                }`}
              >
                {g ? SERVICE_TYPE_LABELS[g] : 'Todo el catálogo'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {grouped.length === 0 && <p className="p-8 text-center text-sm text-gray-400">No hay servicios con ese filtro.</p>}
          {grouped.map(([section, services]) => (
            <div key={section}>
              <p className="sticky top-0 z-10 bg-[#0B1729] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                {section}
              </p>
              {services.map((s) => {
                const added = alreadyAdded.has(s.itemCode);
                const checked = selected.has(s.itemCode);
                const price = multiplier === null && isVariable(s.costType) ? null : priceForCategory(s, category || 'BAJO');
                return (
                  <button
                    key={s.itemCode}
                    type="button"
                    disabled={added}
                    onClick={() => toggle(s)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left ${
                      added ? 'opacity-40' : checked ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked || added ? 'border-[#E63946] bg-[#E63946]' : 'border-gray-500'
                      }`}
                    >
                      {(checked || added) && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{s.description}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                        <span className="font-mono">{s.itemCode}</span>
                        {isVariable(s.costType) && <span className="text-amber-300">Variable</span>}
                        {s.dependencies.length > 0 && (
                          <span className="flex items-center gap-0.5 text-emerald-300">
                            <Link2 className="h-3 w-3" /> {s.dependencies.length} dependencia{s.dependencies.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {added && <span>Ya está en la misión</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{price === null ? '—' : formatCOP(price)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={confirm}
            disabled={selected.size === 0 || (multiplier === null && selectedServices.some((s) => isVariable(s.costType)))}
            className="w-full rounded-md bg-[#E63946] py-3 font-semibold disabled:opacity-40"
          >
            {selected.size === 0
              ? 'Selecciona servicios'
              : `Agregar ${selected.size} servicio${selected.size > 1 ? 's' : ''}${selectedTotal !== null ? ` · ${formatCOP(selectedTotal)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
