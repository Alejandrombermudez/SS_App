import { useState } from 'react';
import Modal from '../../components/Modal';
import { Spinner } from '../../components/ui';
import { formatOrderNumber } from '../../utils/format';

const QUICK_REASONS = [
  'El cliente no aprobó la cotización',
  'Cotización duplicada o error de captura',
  'Cotización de prueba',
  'El cliente desistió del servicio',
];

export const MIN_REASON = 5;

/** Elimina/descarta una misión: la razón es obligatoria y queda en el historial. */
export default function DiscardDialog({
  number,
  isQuote,
  onCancel,
  onConfirm,
}: {
  number: number;
  isQuote: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = reason.trim().length >= MIN_REASON;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason);
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar. Revisa la conexión e intenta de nuevo.');
      setBusy(false);
    }
  }

  return (
    <Modal onDismiss={busy ? () => undefined : onCancel} maxWidthClassName="max-w-md">
      <div className="p-5 text-white">
        <h3 className="text-lg font-bold">
          {isQuote ? 'Descartar' : 'Eliminar'} la misión Nº {formatOrderNumber(number)}
        </h3>
        <p className="mt-1 text-sm text-gray-300">
          No se borra: queda en el historial como <strong>eliminada</strong>, con su razón, y el número se conserva. Se
          puede reabrir cuando quieras. El cliente deja de verla.
        </p>

        <label className="mt-4 block text-xs text-gray-400" htmlFor="discard-reason">
          Razón (obligatoria)
        </label>
        <textarea
          id="discard-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="¿Por qué se elimina?"
          className="mt-1 w-full resize-none rounded-md border border-gray-600 bg-black/30 px-3 py-2 text-sm placeholder:text-gray-500 focus:border-white focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="rounded-full border border-gray-600 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-white/10"
            >
              {r}
            </button>
          ))}
        </div>
        {!valid && reason.length > 0 && <p className="mt-2 text-xs text-amber-300">Escribe al menos {MIN_REASON} caracteres.</p>}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid || busy}
            className="flex items-center gap-2 rounded-md bg-[#E63946] px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {busy && <Spinner className="h-4 w-4" />} {isQuote ? 'Descartar' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
