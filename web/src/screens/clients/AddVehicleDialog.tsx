import { useMemo, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { vehicleConverter } from '../../firestoreConverters';
import Modal from '../../components/Modal';
import { inputClass, labelClass } from '../../components/formStyles';
import { emptyVehicle } from '../../types';
import { calculateCategory, getCategoryColor } from '../../utils/vehicleUtils';

export default function AddVehicleDialog({
  clientId,
  onDismiss,
  onSave,
}: {
  clientId: string;
  onDismiss: () => void;
  onSave: () => void;
}) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [line, setLine] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [cc, setCc] = useState('');
  const [km, setKm] = useState('');
  const [soat, setSoat] = useState('');
  const [tecno, setTecno] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const category = useMemo(() => calculateCategory(cc), [cc]);

  async function handleSave() {
    if (!plate.trim()) {
      setErrorMsg('Placa obligatoria');
      return;
    }
    setSaving(true);
    const vehicle = { ...emptyVehicle(clientId), plate, brand, line, model, color, cc, category, km, soatDate: soat, tecnoDate: tecno };
    await setDoc(doc(db, 'vehicles', plate).withConverter(vehicleConverter), vehicle);
    setSaving(false);
    onSave();
  }

  return (
    <Modal onDismiss={onDismiss}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white">Agregar Motocicleta</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClass}>Placa (Obligatorio)</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Marca</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Línea</label>
              <input value={line} onChange={(e) => setLine(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Modelo</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} inputMode="numeric" className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>CC</label>
              <input value={cc} onChange={(e) => setCc(e.target.value)} inputMode="numeric" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Categoría (Auto)</label>
            <input
              value={category}
              disabled
              className={inputClass}
              style={{ color: getCategoryColor(category) }}
            />
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <input value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kilometraje</label>
            <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" className={inputClass} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>SOAT</label>
              <input value={soat} onChange={(e) => setSoat(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Tecno</label>
              <input value={tecno} onChange={(e) => setTecno(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {errorMsg && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onDismiss} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
