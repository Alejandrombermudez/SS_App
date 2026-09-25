import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { formatCOP as rawCOP } from '../../utils/format';
import { EXPIRY_LABEL, type ExpiryState, type InvoiceModel } from './invoiceModel';

// Este módulo se carga bajo demanda (import dinámico): la librería de PDF pesa bastante y solo
// se necesita al descargar o compartir el documento.

const RED = '#B80828';
const INK = '#171717';
const MUTED = '#6B6B6B';
const LINE = '#E0E0E0';

// Las fuentes estándar de PDF (Helvetica/Courier) usan WinAnsi: se reemplazan los pocos
// caracteres de Intl que no existen ahí (espacios finos, signo menos).
const clean = (s: string) => s.replace(/[  ]/g, ' ').replace(/−/g, '-');
const cop = (n: number) => clean(rawCOP(n));

const s = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 50, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 9, color: INK },
  row: { flexDirection: 'row' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 58, height: 58, marginRight: 12 },
  brandTop: { fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 2.5 },
  brandName: { fontFamily: 'Times-Bold', fontSize: 20, color: RED, letterSpacing: 1 },
  contact: { fontSize: 7.5, color: MUTED, marginTop: 3, maxWidth: 260 },
  docLabel: { fontFamily: 'Courier-Bold', fontSize: 8, letterSpacing: 2, color: MUTED, textAlign: 'right' },
  docNumber: { fontFamily: 'Courier-Bold', fontSize: 22, textAlign: 'right' },
  badge: { marginTop: 4, alignSelf: 'flex-end', paddingVertical: 3, paddingHorizontal: 7, fontFamily: 'Courier-Bold', fontSize: 8, letterSpacing: 1.5 },
  ruleThick: { height: 3, backgroundColor: RED, marginTop: 14 },
  ruleThin: { height: 0.75, backgroundColor: INK, marginTop: 1.5 },
  grid: { flexDirection: 'row', marginTop: 12 },
  col: { flex: 1, paddingRight: 12 },
  blockTitle: { fontFamily: 'Courier-Bold', fontSize: 7.5, letterSpacing: 1.5, color: RED, borderBottomWidth: 0.75, borderBottomColor: '#BDBDBD', paddingBottom: 2, marginBottom: 4 },
  strong: { fontFamily: 'Helvetica-Bold' },
  big: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  kv: { marginTop: 1.5 },
  k: { color: MUTED },
  plate: { alignSelf: 'flex-start', backgroundColor: '#F6C700', borderWidth: 1.5, borderColor: '#000', paddingVertical: 1, paddingHorizontal: 5, fontFamily: 'Courier-Bold', fontSize: 11, letterSpacing: 2 },
  notes: { marginTop: 10, borderLeftWidth: 3, borderLeftColor: RED, backgroundColor: '#F7F7F7', paddingVertical: 6, paddingHorizontal: 10 },
  notesTitle: { fontFamily: 'Courier-Bold', fontSize: 7, letterSpacing: 1.5, color: MUTED, marginBottom: 2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 3 },
  sectionMark: { width: 4, height: 9, backgroundColor: RED, marginRight: 5 },
  sectionText: { fontFamily: 'Courier-Bold', fontSize: 9, letterSpacing: 1.5 },
  th: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: INK, paddingVertical: 3, fontFamily: 'Courier-Bold', fontSize: 7, color: MUTED },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 2.5 },
  group: { backgroundColor: '#F2F2F2', paddingTop: 3, paddingBottom: 2, paddingHorizontal: 3, fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#555', letterSpacing: 0.8 },
  cCode: { width: 34, fontFamily: 'Courier', fontSize: 7.5, color: MUTED },
  cType: { width: 62, fontSize: 7.5, color: MUTED },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 28, textAlign: 'center' },
  cMoney: { width: 64, textAlign: 'right' },
  totalsWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
  seal: { width: 92, height: 92, transform: 'rotate(-12deg)', opacity: 0.9, marginLeft: 16 },
  totals: { width: 230 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3, paddingHorizontal: 2 },
  grand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INK, borderLeftWidth: 5, borderLeftColor: RED, paddingVertical: 7, paddingHorizontal: 8, marginTop: 5 },
  grandLabel: { fontFamily: 'Courier-Bold', fontSize: 7.5, color: '#FFF', letterSpacing: 1 },
  grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#FFF' },
  note: { fontSize: 7, color: MUTED, marginTop: 3 },
  footer: { position: 'absolute', left: 40, right: 40, bottom: 22, borderTopWidth: 0.5, borderTopColor: '#BDBDBD', paddingTop: 5, fontSize: 7, color: MUTED, textAlign: 'center' },
  footerMono: { fontFamily: 'Courier', fontSize: 6.5, letterSpacing: 0.8, marginTop: 1 },
});

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <Text style={s.kv}>
      <Text style={s.k}>{k}: </Text>
      {clean(v)}
    </Text>
  );
}

function ExpiryLine({ label, date, state }: { label: string; date: string; state: ExpiryState }) {
  const color = state === 'expired' ? RED : state === 'soon' ? '#B45309' : '#525252';
  return (
    <Text style={[s.kv, { color, fontSize: 8 }]}>
      {label}: {date}
      {(state === 'expired' || state === 'soon') && <Text style={s.strong}> ({EXPIRY_LABEL[state].toUpperCase()})</Text>}
    </Text>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={s.sectionTitle} wrap={false}>
      <View style={s.sectionMark} />
      <Text style={s.sectionText}>{children}</Text>
    </View>
  );
}

function InvoiceDocument({ m, origin }: { m: InvoiceModel; origin: string }) {
  return (
    <Document title={`Misión Nº ${m.number}`} author={m.business.name} subject={m.statusLabel} language="es">
      <Page size="LETTER" style={s.page}>
        {/* CABECERA */}
        <View style={s.header}>
          <View style={s.brand}>
            <Image src={`${origin}/brand/agente.png`} style={s.logo} />
            <View>
              <Text style={s.brandTop}>SERVICIO SECRETO</Text>
              <Text style={s.brandName}>MOTORCYCLES</Text>
              {m.contactLine ? <Text style={s.contact}>{clean(m.contactLine)}</Text> : null}
              {m.business.address || m.business.city ? (
                <Text style={s.contact}>{clean([m.business.address, m.business.city].filter(Boolean).join(', '))}</Text>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={s.docLabel}>DOCUMENTO DE MISIÓN</Text>
            <Text style={s.docNumber}>Nº {m.number}</Text>
            <Text
              style={[
                s.badge,
                m.isQuote ? { borderWidth: 1.2, borderColor: RED, color: RED } : { backgroundColor: RED, color: '#FFF' },
              ]}
            >
              {m.statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={s.ruleThick} />
        <View style={s.ruleThin} />

        {/* CLIENTE / VEHÍCULO / MISIÓN */}
        <View style={s.grid}>
          <View style={s.col}>
            <Text style={s.blockTitle}>CLIENTE</Text>
            <Text style={s.big}>{clean(m.client.name)}</Text>
            <Kv k="C.C. / NIT" v={m.client.id} />
            {m.client.phone ? <Kv k="Teléfono" v={m.client.phone} /> : null}
            {m.client.email ? <Kv k="Correo" v={m.client.email} /> : null}
          </View>
          <View style={s.col}>
            <Text style={s.blockTitle}>VEHÍCULO</Text>
            <Text style={s.plate}>{m.vehicle.plate}</Text>
            {m.vehicle.title ? <Text style={[s.strong, { marginTop: 3 }]}>{clean(m.vehicle.title)}</Text> : null}
            {m.vehicle.details ? <Text style={{ color: '#525252' }}>{clean(m.vehicle.details)}</Text> : null}
            {m.vehicle.soat.date ? <ExpiryLine label="SOAT" date={m.vehicle.soat.date} state={m.vehicle.soat.state} /> : null}
            {m.vehicle.tecno.date ? <ExpiryLine label="Tecnomecánica" date={m.vehicle.tecno.date} state={m.vehicle.tecno.state} /> : null}
          </View>
          <View style={[s.col, { paddingRight: 0 }]}>
            <Text style={s.blockTitle}>MISIÓN</Text>
            <Kv k="Servicio" v={m.mission.serviceType} />
            {m.mission.entry ? <Kv k="Ingreso" v={m.mission.entry} /> : null}
            {m.mission.exit ? <Kv k="Salida" v={m.mission.exit} /> : null}
            {m.mission.km ? <Kv k="Kilometraje" v={m.mission.km} /> : null}
          </View>
        </View>

        {m.initialNotes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.notesTitle}>OBSERVACIONES INICIALES</Text>
            <Text>{clean(m.initialNotes)}</Text>
          </View>
        ) : null}

        {/* SERVICIOS */}
        {m.serviceGroups.length > 0 ? (
          <View>
            <SectionTitle>DETALLES DE LA MISIÓN</SectionTitle>
            <View style={s.th} fixed={false}>
              <Text style={s.cCode}>ÍTEM</Text>
              <Text style={s.cDesc}>DESCRIPCIÓN</Text>
              <Text style={s.cQty}>CANT.</Text>
              <Text style={s.cMoney}>PRECIO</Text>
              <Text style={s.cMoney}>TOTAL</Text>
            </View>
            {m.serviceGroups.map(([section, lines]) => (
              <View key={section}>
                <Text style={s.group} minPresenceAhead={20}>
                  {clean(section.toUpperCase())}
                </Text>
                {lines.map((l, i) => (
                  <View key={i} style={s.tr} wrap={false}>
                    <Text style={s.cCode}>{l.itemCode}</Text>
                    <Text style={s.cDesc}>{clean(l.description)}</Text>
                    <Text style={s.cQty}>{l.quantity}</Text>
                    <Text style={s.cMoney}>{cop(l.price)}</Text>
                    <Text style={s.cMoney}>{cop(l.quantity * l.price)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* RECURSOS */}
        {m.parts.length > 0 ? (
          <View>
            <SectionTitle>RECURSOS DE LA MISIÓN</SectionTitle>
            <View style={s.th}>
              <Text style={s.cType}>TIPO</Text>
              <Text style={s.cDesc}>DESCRIPCIÓN</Text>
              <Text style={s.cQty}>CANT.</Text>
              <Text style={s.cMoney}>PRECIO</Text>
              <Text style={s.cMoney}>TOTAL</Text>
            </View>
            {m.parts.map((p, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={s.cType}>{clean(p.type)}</Text>
                <Text style={s.cDesc}>{clean(p.description)}</Text>
                <Text style={s.cQty}>{p.quantity}</Text>
                <Text style={s.cMoney}>{cop(p.price)}</Text>
                <Text style={s.cMoney}>{cop(p.quantity * p.price)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* LIQUIDACIÓN */}
        <View style={s.totalsWrap} wrap={false}>
          <Image src={`${origin}/brand/sello.png`} style={s.seal} />
          <View style={s.totals}>
            <View style={s.tRow}>
              <Text style={s.k}>Subtotal de servicios</Text>
              <Text style={s.strong}>{cop(m.totals.subtotal)}</Text>
            </View>
            {m.discountPct > 0 ? (
              <View style={s.tRow}>
                <Text style={s.k}>Descuento {m.discountPct}%*</Text>
                <Text style={[s.strong, { color: RED }]}>- {cop(m.totals.discount)}</Text>
              </View>
            ) : null}
            <View style={s.tRow}>
              <Text style={s.k}>Total de servicios</Text>
              <Text style={s.strong}>{cop(m.totals.servicesTotal)}</Text>
            </View>
            <View style={s.tRow}>
              <Text style={s.k}>Total de recursos</Text>
              <Text style={s.strong}>{cop(m.totals.partsTotal)}</Text>
            </View>
            <View style={s.grand}>
              <Text style={s.grandLabel}>COSTO TOTAL DE LA MISIÓN</Text>
              <Text style={s.grandValue}>{cop(m.totals.total)}</Text>
            </View>
            {m.discountPct > 0 && m.business.discountNote ? <Text style={s.note}>* {clean(m.business.discountNote)}</Text> : null}
          </View>
        </View>

        {m.finalNotes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.notesTitle}>OBSERVACIONES FINALES</Text>
            <Text>{clean(m.finalNotes)}</Text>
          </View>
        ) : null}

        {m.validityNote ? <Text style={[s.note, { marginTop: 12, textAlign: 'center', color: INK }]}>{m.validityNote}</Text> : null}

        {/* PIE (se repite en cada página) */}
        <View style={s.footer} fixed>
          {m.business.footerNote ? <Text>{clean(m.business.footerNote)}</Text> : null}
          <Text
            style={s.footerMono}
            render={({ pageNumber, totalPages }) =>
              clean(`${m.business.name.toUpperCase()} · MISIÓN Nº ${m.number} · GENERADO EL ${m.generatedOn} · PÁGINA ${pageNumber} DE ${totalPages}`)
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(m: InvoiceModel, origin: string): Promise<Blob> {
  return pdf(<InvoiceDocument m={m} origin={origin} />).toBlob();
}
