import { useEffect, useState } from 'react';
import { ChevronDown, PlusCircle, Search, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { inputClass, labelClass } from '../../components/formStyles';
import type { Service } from '../../types';
import { GROUP_OPTIONS, SECTIONS_MAP, getNextCode } from '../../utils/serviceUtils';

interface Props {
  service: Service | null;
  existingServices: Service[];
  onDismiss: () => void;
  onSave: (service: Service, oldCode: string | null) => void | Promise<void>;
}

export default function ServiceFormDialog({ service, existingServices, onDismiss, onSave }: Props) {
  const isEditing = service !== null;
  const originalCode = service?.itemCode ?? null;
  const availableSections = Object.keys(SECTIONS_MAP).sort();

  const [section, setSection] = useState(service?.section ?? 'Admisión');
  const [itemCode, setItemCode] = useState(service?.itemCode ?? getNextCode(section, existingServices));
  const [description, setDescription] = useState(service?.description ?? '');
  const [priceStr, setPriceStr] = useState(service?.price?.toString() ?? '0');
  const [costType, setCostType] = useState(service?.costType ?? 'Fijo');
  const [dependencies, setDependencies] = useState<string[]>(service?.dependencies ?? []);
  const [showDependencySelector, setShowDependencySelector] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    !service?.serviceGroup ? new Set(['Especifico']) : new Set(service.serviceGroup.split('/').map((s) => s.trim())),
  );
  const [expandedSection, setExpandedSection] = useState(false);

  useEffect(() => {
    if (isEditing && section === service?.section) {
      setItemCode(service.itemCode);
    } else {
      setItemCode(getNextCode(section, existingServices));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  function toggleGroup(option: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        if (next.size > 1) next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  }

  function handleSubmit() {
    const finalGroupString = [...selectedGroups].sort().join('/');
    const newService: Service = {
      id: service?.id ?? '',
      itemCode,
      section,
      description,
      price: Number.parseInt(priceStr, 10) || 0,
      costType,
      serviceGroup: finalGroupString,
      dependencies,
    };
    void onSave(newService, originalCode);
  }

  return (
    <Modal onDismiss={onDismiss}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white">{isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>

        <div className="mt-6 space-y-4">
          <div>
            <label className={labelClass}>Sección</label>
            {isEditing ? (
              <input value={section} disabled className={inputClass} />
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExpandedSection((v) => !v)}
                  className={`${inputClass} flex items-center justify-between text-left`}
                >
                  {section}
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {expandedSection && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-700 bg-[#1E2D45] shadow-lg">
                    {availableSections.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSection(option);
                          setExpandedSection(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Código</label>
            <input value={itemCode} disabled className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Precio</label>
            <input
              value={priceStr}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) setPriceStr(e.target.value);
              }}
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <div>
            <p className={labelClass}>Grupos:</p>
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map((option) => {
                const isSelected = selectedGroups.has(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleGroup(option)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      isSelected ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Costo:</span>
            {['Fijo', 'Variable'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCostType(option)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  costType === option ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <hr className="border-gray-600/50" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Dependencias</span>
              <button
                type="button"
                onClick={() => setShowDependencySelector(true)}
                aria-label="Añadir dependencia"
                className="text-[#4CAF50]"
              >
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>

            {dependencies.length === 0 ? (
              <p className="mt-2 text-xs italic text-gray-400">No tiene dependencias.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {dependencies.map((depCode) => {
                  const depService = existingServices.find((s) => s.itemCode === depCode);
                  return (
                    <div
                      key={depCode}
                      className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-white">
                          {depService?.description ?? `Servicio desconocido (${depCode})`}
                        </p>
                        <p className="text-[10px] text-gray-400">Código: {depCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDependencies((prev) => prev.filter((c) => c !== depCode))}
                        aria-label="Quitar"
                        className="shrink-0 text-[#E63946]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onDismiss} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {isEditing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>

      {showDependencySelector && (
        <ServiceSelectionDialog
          allServices={existingServices}
          currentServiceCode={itemCode}
          currentDependencies={dependencies}
          onDismiss={() => setShowDependencySelector(false)}
          onServiceSelected={(code) => {
            setDependencies((prev) => [...prev, code]);
            setShowDependencySelector(false);
          }}
        />
      )}
    </Modal>
  );
}

function ServiceSelectionDialog({
  allServices,
  currentServiceCode,
  currentDependencies,
  onDismiss,
  onServiceSelected,
}: {
  allServices: Service[];
  currentServiceCode: string;
  currentDependencies: string[];
  onDismiss: () => void;
  onServiceSelected: (code: string) => void;
}) {
  const [q, setQ] = useState('');

  const filtered = allServices
    .filter(
      (s) =>
        s.itemCode !== currentServiceCode &&
        !currentDependencies.includes(s.itemCode) &&
        (s.description.toLowerCase().includes(q.toLowerCase()) ||
          s.itemCode.toLowerCase().includes(q.toLowerCase())),
    )
    .slice(0, 20);

  return (
    <Modal onDismiss={onDismiss}>
      <div className="flex h-[500px] flex-col p-4">
        <h3 className="text-lg font-bold text-white">Agregar Dependencia</h3>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar servicio..."
            className={`${inputClass} pl-9`}
            autoFocus
          />
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.itemCode}
              type="button"
              onClick={() => onServiceSelected(s.itemCode)}
              className="flex w-full items-center justify-between rounded-lg bg-[#1E2D45] p-3 text-left hover:bg-[#26395a]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{s.description}</p>
                <p className="text-xs text-gray-400">
                  {s.section} - Código: {s.itemCode}
                </p>
              </div>
              <span className="shrink-0 text-[#4CAF50]">+</span>
            </button>
          ))}
        </div>

        <button type="button" onClick={onDismiss} className="mt-3 py-2 text-sm text-gray-400 hover:text-white">
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
