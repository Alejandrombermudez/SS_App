import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Printer, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessSettings, useClient, useOrder, useVehicle } from '../../data/hooks';
import { CenteredMessage, ScreenHeader, Spinner } from '../../components/ui';
import { formatOrderNumber } from '../../utils/format';
import { buildInvoice } from './invoiceModel';
import InvoiceView from './InvoiceView';

function canShareFiles(): boolean {
  try {
    const probe = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export default function InvoiceScreen() {
  const { id } = useParams();
  const number = Number.parseInt(id ?? '', 10) || null;
  const navigate = useNavigate();
  const order = useOrder(number);
  const vehicle = useVehicle(order.data?.vehiclePlate ?? null);
  const client = useClient(order.data?.clientId ?? null);
  const business = useBusinessSettings();
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shareSupported = useMemo(canShareFiles, []);

  const model = useMemo(
    () => (order.data ? buildInvoice(order.data, client.data, vehicle.data, business.data) : null),
    [order.data, client.data, vehicle.data, business.data],
  );

  const { role } = useAuth();
  // El cliente vuelve a su portal; el personal, al editor de la misión.
  const back = () => navigate(role === 'client' ? '/' : `/orders/${id}`);

  if (order.loading || vehicle.loading || client.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-800">
        <Spinner />
      </div>
    );
  }
  if (!model) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
        <ScreenHeader title="Documento" onBack={back} />
        <CenteredMessage>{order.error ?? `La misión ${id} no existe.`}</CenteredMessage>
      </div>
    );
  }

  async function makePdf(): Promise<Blob> {
    const { renderInvoicePdf } = await import('./InvoicePdf');
    return renderInvoicePdf(model!, window.location.origin);
  }

  async function download() {
    setBusy('download');
    setError(null);
    try {
      const blob = await makePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = model!.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el PDF.');
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy('share');
    setError(null);
    try {
      const blob = await makePdf();
      const file = new File([blob], model!.fileName, { type: 'application/pdf' });
      await navigator.share({
        files: [file],
        title: `${model!.statusLabel} Nº ${model!.number}`,
        text: `${model!.statusLabel} Nº ${model!.number} · ${model!.vehicle.plate}`,
      });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error(err);
        setError('No se pudo compartir el PDF.');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="invoice-screen min-h-dvh bg-neutral-700">
      <div className="no-print">
        <ScreenHeader
          title={`${model.statusLabel} Nº ${formatOrderNumber(order.data!.number)}`}
          subtitle="Vista previa del documento"
          onBack={back}
        />
      </div>

      <div className="no-print sticky top-[56px] z-10 flex flex-wrap items-center justify-center gap-2 bg-neutral-800/95 px-4 py-2.5 backdrop-blur">
        {shareSupported && (
          <button
            type="button"
            onClick={() => void share()}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-md bg-[#B80828] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy === 'share' ? <Spinner className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} Compartir PDF
          </button>
        )}
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy !== null}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
            shareSupported ? 'bg-white/15' : 'bg-[#B80828]'
          }`}
        >
          {busy === 'download' ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Descargar PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="hidden items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-semibold text-white sm:flex"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        {error && <p className="w-full text-center text-xs text-red-300">{error}</p>}
      </div>

      <div className="px-2 py-4 sm:px-4 sm:py-8">
        <InvoiceView m={model} />
      </div>
    </div>
  );
}
