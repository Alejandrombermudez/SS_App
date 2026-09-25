import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ChevronDown, FilePlus2, Send, Trash2, X } from 'lucide-react';
import { db } from '../../firebase';
import { vehicleConverter } from '../../firestoreConverters';
import { useAuth } from '../../contexts/AuthContext';
import { useOrdersWhere } from '../../data/hooks';
import Modal from '../../components/Modal';
import { StatusChip } from '../../components/ui';
import type { Client, Vehicle } from '../../types';
import { formatCOP, formatDate, formatOrderNumber } from '../../utils/format';
import { calculateCategory, getCategoryColor } from '../../utils/vehicleUtils';

export default function VehicleDetailDialog({
  vehicle,
  allClients,
  onDismiss,
  onUpdate,
}: {
  vehicle: Vehicle;
  allClients: Client[];
  onDismiss: () => void;
  onUpdate: () => void;
}) {
  const [brand, setBrand] = useState(vehicle.brand);
  const [line, setLine] = useState(vehicle.line);
  const [model, setModel] = useState(vehicle.model);
  const [color, setColor] = useState(vehicle.color);
  const [cc, setCc] = useState(vehicle.cc);
  const [km, setKm] = useState(vehicle.km);
  const [soat, setSoat] = useState(vehicle.soatDate);
  const [tecno, setTecno] = useState(vehicle.tecnoDate);
  const [category, setCategory] = useState(vehicle.category || calculateCategory(vehicle.cc));
  const [expandedCategoryMenu, setExpandedCategoryMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { role } = useAuth();
  const orders = useOrdersWhere('vehicle_plate', vehicle.plate);

  const categoryOptions = ['BAJO', 'MEDIO', 'ALTO'];

  async function handleSave() {
    setSaving(true);
    setError(null);
    const updated: Vehicle = { ...vehicle, brand, line, model, color, cc, category, km, soatDate: soat, tecnoDate: tecno };
    try {
      await setDoc(doc(db, 'vehicles', vehicle.plate).withConverter(vehicleConverter), updated, { merge: true });
      onUpdate();
    } catch (err) {
      console.error(err);
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteDoc(doc(db, 'vehicles', vehicle.plate));
      onUpdate();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar la moto.');
    }
  }

  return (
    <Modal onDismiss={onDismiss}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Editar Ficha Técnica</span>
          <button type="button" onClick={onDismiss} aria-label="Cerrar" className="text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-center text-3xl font-bold text-[#E63946]">{vehicle.plate}</p>

        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-lg font-bold text-white">
            {brand} {line}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExpandedCategoryMenu((v) => !v)}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-black"
              style={{ backgroundColor: getCategoryColor(category) }}
            >
              {category}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {expandedCategoryMenu && (
              <div className="absolute z-10 mt-1 rounded-md border border-gray-700 bg-[#1E2D45] shadow-lg">
                {categoryOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setCategory(option);
                      setExpandedCategoryMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm font-bold"
                    style={{ color: getCategoryColor(option) }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <EditCell label="Marca" value={brand} onChange={setBrand} />
          <EditCell label="Línea" value={line} onChange={setLine} />
          <EditCell label="Modelo" value={model} onChange={setModel} numeric />
          <EditCell label="Color" value={color} onChange={setColor} />
          <EditCell label="CC" value={cc} onChange={setCc} numeric />
          <EditCell label="Km" value={km} onChange={setKm} numeric />
        </div>

        <hr className="my-4 border-gray-600/30" />

        <div className="grid grid-cols-2 gap-3">
          <EditCell label="Vence SOAT" value={soat} onChange={setSoat} type="date" />
          <EditCell label="Vence Tecno" value={tecno} onChange={setTecno} type="date" />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="mt-6 w-full rounded-md bg-white py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          GUARDAR CAMBIOS
        </button>

        {/* MISIONES DE ESTA MOTO */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Misiones</p>
            <button
              type="button"
              onClick={() => navigate(`/orders/new?plate=${vehicle.plate}`)}
              className="flex items-center gap-1 text-sm font-medium text-[#E63946]"
            >
              <FilePlus2 className="h-4 w-4" /> Nueva cotización
            </button>
          </div>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {orders.loading ? (
              <p className="text-xs text-gray-500">Cargando…</p>
            ) : orders.data.length === 0 ? (
              <p className="text-xs text-gray-500">Sin misiones registradas.</p>
            ) : (
              orders.data.map((o) => (
                <button
                  key={o.number}
                  type="button"
                  onClick={() => navigate(`/orders/${o.number}`)}
                  className="flex w-full items-center gap-2 rounded-md bg-black/20 px-3 py-2 text-left text-sm hover:bg-black/30"
                >
                  <span className="font-mono text-xs">Nº {formatOrderNumber(o.number)}</span>
                  <StatusChip status={o.status} />
                  <span className="ml-auto text-xs text-gray-400">{formatDate(o.entryDate)}</span>
                  <span className="w-24 text-right font-semibold">{formatCOP(o.total)}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-2">
          {role === 'admin' ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 rounded-md border border-[#E63946] px-3 py-2 text-xs text-[#E63946]"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setShowTransferDialog(true)}
            className="flex items-center gap-1 rounded-md border border-[#4CAF50] px-3 py-2 text-xs text-[#4CAF50]"
          >
            <Send className="h-4 w-4" /> Transferir
          </button>
        </div>
      </div>

      {showTransferDialog && (
        <TransferDialog
          vehicle={vehicle}
          allClients={allClients}
          onDismiss={() => setShowTransferDialog(false)}
          onTransferred={onUpdate}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDeleteDialog onCancel={() => setShowDeleteConfirm(false)} onConfirm={() => void handleDelete()} />
      )}
    </Modal>
  );
}

function EditCell({
  label,
  value,
  onChange,
  numeric = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  type?: 'text' | 'date';
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={numeric ? 'numeric' : 'text'}
        className="w-full rounded-md border border-gray-600/50 bg-black/20 px-3 py-2 text-sm font-bold text-white focus:border-white focus:outline-none"
      />
    </div>
  );
}

function TransferDialog({
  vehicle,
  allClients,
  onDismiss,
  onTransferred,
}: {
  vehicle: Vehicle;
  allClients: Client[];
  onDismiss: () => void;
  onTransferred: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedNewOwner, setSelectedNewOwner] = useState<Client | null>(null);
  const [transferring, setTransferring] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const tokens = query.trim().toLowerCase().split(' ');
    return allClients
      .filter((c) => tokens.every((t) => `${c.id} ${c.name}`.toLowerCase().includes(t)))
      .slice(0, 4);
  }, [query, allClients]);

  async function confirmTransfer() {
    if (!selectedNewOwner) return;
    setTransferring(true);
    await updateDoc(doc(db, 'vehicles', vehicle.plate), { client_id: selectedNewOwner.id });
    setTransferring(false);
    onTransferred();
  }

  return (
    <Modal onDismiss={onDismiss}>
      <div className="p-5">
        <h3 className="text-lg font-bold text-white">Transferir Propiedad</h3>

        {!selectedNewOwner ? (
          <>
            <p className="mt-4 text-xs text-gray-400">Buscar nuevo propietario:</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o Cédula"
              className="mt-2 w-full rounded-md border border-gray-600 bg-black/30 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
              autoFocus
            />
            <div className="mt-2 space-y-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (c.id === vehicle.clientId) return;
                    setSelectedNewOwner(c);
                  }}
                  className="flex w-full items-center gap-2 rounded-md bg-black/20 p-2 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-xs text-gray-400">CC: {c.id}</p>
                  </div>
                </button>
              ))}
              {query && filtered.length === 0 && <p className="text-sm text-gray-400">No encontrado</p>}
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-xs text-gray-400">Transferir a:</p>
            <div className="mt-2 flex items-center justify-between rounded-md bg-[#4CAF50]/20 p-3">
              <div>
                <p className="font-bold text-white">{selectedNewOwner.name}</p>
                <p className="text-xs text-white/70">CC: {selectedNewOwner.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNewOwner(null);
                  setQuery('');
                }}
                aria-label="Quitar selección"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onDismiss} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmTransfer()}
            disabled={!selectedNewOwner || transferring}
            className="rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmDeleteDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal onDismiss={onCancel} maxWidthClassName="max-w-xs">
      <div className="p-5">
        <h3 className="text-lg font-bold text-white">¿Eliminar?</h3>
        <p className="mt-2 text-sm text-gray-300">Se borrará permanentemente.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-red-500">
            Eliminar
          </button>
        </div>
      </div>
    </Modal>
  );
}
