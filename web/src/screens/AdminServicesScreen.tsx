import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, deleteDoc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Link2, Plus, Search, Wrench, X } from 'lucide-react';
import { db } from '../firebase';
import { serviceConverter } from '../firestoreConverters';
import type { Service } from '../types';
import { GROUP_OPTIONS } from '../utils/serviceUtils';
import ServiceFormDialog from './services/ServiceFormDialog';

export default function AdminServicesScreen() {
  const navigate = useNavigate();

  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);

  // 1. CARGA DE DATOS (tiempo real)
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('item_code')).withConverter(serviceConverter);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setServicesList(snapshot.docs.map((d) => d.data()));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  // 2. FILTRADO
  const filteredList = useMemo(() => {
    const queryRaw = searchText.trim().toLowerCase();
    const tokens = queryRaw.length > 0 ? queryRaw.split(/\s+/) : [];

    const textFiltered =
      tokens.length === 0
        ? servicesList
        : servicesList.filter((service) => {
            const fullText = `${service.itemCode} ${service.description} ${service.section}`.toLowerCase();
            return tokens.every((token) => fullText.includes(token));
          });

    if (selectedGroupFilters.size === 0) return textFiltered;

    return textFiltered.filter((service) =>
      [...selectedGroupFilters].every((filter) =>
        service.serviceGroup.toLowerCase().includes(filter.toLowerCase()),
      ),
    );
  }, [servicesList, searchText, selectedGroupFilters]);

  const groupedServices = useMemo(() => {
    const groups = new Map<string, Service[]>();
    for (const service of filteredList) {
      const list = groups.get(service.section) ?? [];
      list.push(service);
      groups.set(service.section, list);
    }
    return groups;
  }, [filteredList]);

  const isFiltering = searchText.trim().length > 0 || selectedGroupFilters.size > 0;

  function toggleGroupFilter(group: string) {
    setSelectedGroupFilters((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function handleSave(serviceToSave: Service, oldCode: string | null) {
    if (oldCode !== null && oldCode !== serviceToSave.itemCode) {
      await deleteDoc(doc(db, 'services', oldCode));
    }
    await setDoc(doc(db, 'services', serviceToSave.itemCode).withConverter(serviceConverter), serviceToSave, {
      merge: true,
    });
    setShowDialog(false);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0b0b] text-white">
      <header className="flex items-center gap-3 bg-black px-4 py-3">
        <button type="button" onClick={() => navigate('/')} aria-label="Volver" className="rounded p-1 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-medium">Gestión de Servicios</h1>
      </header>

      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-md border border-gray-700 bg-black/30 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {GROUP_OPTIONS.map((group) => {
            const isSelected = selectedGroupFilters.has(group);
            return (
              <button
                key={group}
                type="button"
                onClick={() => toggleGroupFilter(group)}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  isSelected
                    ? 'border-white bg-white text-black'
                    : 'border-gray-600 bg-black/50 text-gray-300'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
                {group}
              </button>
            );
          })}
          {selectedGroupFilters.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedGroupFilters(new Set())}
              aria-label="Limpiar filtros"
              className="shrink-0 rounded p-1.5 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-0 pb-24 pt-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : (
          [...groupedServices.entries()].map(([section, services]) => {
            const isExpanded = expandedSections.has(section) || isFiltering;
            return (
              <div key={section}>
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="flex w-full items-center justify-between bg-black/70 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold uppercase">{section}</span>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-gray-300">
                      {services.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {isExpanded &&
                  services.map((service) => (
                    <ServiceItemRow
                      key={service.id}
                      service={service}
                      onClick={() => {
                        setCurrentService(service);
                        setShowDialog(true);
                      }}
                    />
                  ))}
              </div>
            );
          })
        )}
      </main>

      <button
        type="button"
        onClick={() => {
          setCurrentService(null);
          setShowDialog(true);
        }}
        aria-label="Nuevo servicio"
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showDialog && (
        <ServiceFormDialog
          service={currentService}
          existingServices={servicesList}
          onDismiss={() => setShowDialog(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ServiceItemRow({ service, onClick }: { service: Service; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-4 my-1 flex w-[calc(100%-2rem)] items-center gap-4 rounded-lg bg-[#1E1E1E] p-4 text-left"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#333333] px-1.5 py-0.5 text-[11px] font-bold text-white">
            {service.itemCode}
          </span>
          {service.costType.toLowerCase() === 'variable' && <Wrench className="h-3.5 w-3.5" />}
          {service.dependencies.length > 0 && <Link2 className="h-3.5 w-3.5 text-[#4CAF50]" />}
        </div>
        <p className="mt-1 truncate text-sm">{service.description}</p>
        {service.serviceGroup && <p className="text-[10px] text-gray-400">{service.serviceGroup}</p>}
      </div>
      <span className="shrink-0 font-bold">$ {service.price.toLocaleString('es-CO')}</span>
    </button>
  );
}
