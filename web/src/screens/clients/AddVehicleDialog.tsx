import { useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { vehicleConverter } from '../../firestoreConverters';
import Modal from '../../components/Modal';
import { inputClass, labelClass } from '../../components/formStyles';
import { emptyVehicle } from '../../types';
import { normalizePlate } from '../../utils/format';
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
  // Categoría automática por cilindraje, salvo que se elija a mano (motos de mediana cilindrada
  // que llevan trabajo de alta, por ejemplo).
  const [manualCategory, setManualCategory] = useState<string | null>(null);

  const autoCategory = useMemo(() => calculateCategory(cc), [cc]);
  const category = manualCategory ?? autoCategory;

  async function handleSave() {
    if (!/^[0-9A-Z]{5,7}$/.test(plate)) {
      setErrorMsg('Escribe una placa válida (5 a 7 letras y números, ej. ABC12D).');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const existing = await getDoc(doc(db, 'vehicles', plate));
      if (existing.exists()) {
        setErrorMsg(`La placa ${plate} ya está registrada (propietario ${existing.data().client_id}). Usa "Transferir" desde su ficha.`);
        return;
      }
      const vehicle = { ...emptyVehicle(clientId), plate, brand, line, model, color, cc, category, km, soatDate: soat, tecnoDate: tecno };
      await setDoc(doc(db, 'vehicles', plate).withConverter(vehicleConverter), vehicle);
      onSave();
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo guardar la moto. Revisa la conexión o tus permisos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onDismiss={onDismiss}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white">Agregar Motocicleta</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClass}>Placa (Obligatorio)</label>
            <input value={plate} onChange={(e) => setPlate(normalizePlate(e.target.value))} maxLength={7} className={inputClass} />
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
            <label className={labelClass}>
              Categoría {manualCategory ? '(manual)' : '(automática por cilindraje)'}
            </label>
            <div className="flex gap-2">
              {(['BAJO', 'MEDIO', 'ALTO'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setManualCategory(c === autoCategory ? null : c)}
                  className="flex-1 rounded-md border py-2 text-sm font-bold"
                  style={
                    category === c
                      ? { backgroundColor: getCategoryColor(c), borderColor: getCategoryColor(c), color: '#000' }
                      : { borderColor: '#4B5563', color: getCategoryColor(c) }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
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
              <label className={labelClass}>Vence SOAT</label>
              <input type="date" value={soat} onChange={(e) => setSoat(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Vence Tecno</label>
              <input type="date" value={tecno} onChange={(e) => setTecno(e.target.value)} className={inputClass} />
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
