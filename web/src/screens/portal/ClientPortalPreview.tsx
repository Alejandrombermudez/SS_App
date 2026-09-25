import { useParams } from 'react-router-dom';
import ClientPortal from './ClientPortal';

/** Para el personal: ver el portal exactamente como lo ve un cliente. */
export default function ClientPortalPreview() {
  const { clientId } = useParams();
  return <ClientPortal previewOf={clientId} />;
}
