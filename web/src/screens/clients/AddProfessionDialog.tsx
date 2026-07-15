import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../../components/Modal';
import { inputClass, labelClass } from '../../components/formStyles';

export default function AddProfessionDialog({
  onDismiss,
  onSave,
}: {
  onDismiss: () => void;
  onSave: (profession: string) => void;
}) {
  const [newProfession, setNewProfession] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = newProfession.trim();
    if (!trimmed) return;
    setSaving(true);
    await addDoc(collection(db, 'professions'), { name: trimmed });
    setSaving(false);
    onSave(trimmed);
  }

  return (
    <Modal onDismiss={onDismiss}>
      <div className="p-5">
        <h3 className="text-lg font-bold text-white">Nueva Profesión</h3>
        <div className="mt-4">
          <label className={labelClass}>Nombre (Ej: Ingeniero)</label>
          <input
            value={newProfession}
            onChange={(e) =>
              setNewProfession(e.target.value.replace(/^./, (c) => c.toUpperCase()))
            }
            className={inputClass}
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onDismiss} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !newProfession.trim()}
            className="rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
