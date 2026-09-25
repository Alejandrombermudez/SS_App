import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { formatCOP as rawCOP } from '../../utils/format';
import { EXPIRY_LABEL, INVOICE_COLORS as C, type ExpiryState, type Field, type InvoiceModel } from './invoiceModel';

// Este módulo se carga bajo demanda (import dinámico): la librería de PDF pesa bastante y solo
// se necesita al descargar o compartir el documento.

const MUTED = '#6B6B6B';
const LINE = '#E0E0E0';

// Las fuentes estándar de PDF (Helvetica/Courier) usan WinAnsi: se reemplazan los pocos
// caracteres de Intl que no existen ahí (espacios finos, signo menos).
const clean = (s: string) => s.replace(/[  ]/g, ' ').replace(/−/g, '-');
const cop = (n: number) => clean(rawCOP(n));

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 48, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 9, color: C.ink },
  header: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 54, height: 54, marginRight: 10 },
  brandTop: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, letterSpacing: 2.5 },
  brandName: { fontFamily: 'Times-Bold', fontSize: 21, color: C.red, letterSpacing: 1 },
  contact: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  docLabel: { fontFamily: 'Courier-Bold', fontSize: 7.5, letterSpacing: 1.5, color: MUTED, textAlign: 'right' },
  docNumber: { fontFamily: 'Courier-Bold', fontSize: 21, textAlign: 'right' },
  badge: { marginTop: 3, alignSelf: 'flex-end', paddingVertical: 2.5, paddingHorizontal: 6, fontFamily: 'Courier-Bold', fontSize: 7.5, letterSpacing: 1.2 },
  strip: { borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: LINE, paddingVertical: 3, marginTop: 6, alignItems: 'center' },
  stripImg: { height: 28, width: 209 },
  ruleRed: { height: 3, backgroundColor: C.red },
  grid: { flexDirection: 'row', marginTop: 12 },
  col: { flex: 1, paddingRight: 12 },
  blockTitle: { fontFamily: 'Courier-Bold', fontSize: 7.5, letterSpacing: 1.3, color: C.red, borderBottomWidth: 1.2, borderBottomColor: C.ink, paddingBottom: 2, marginBottom: 4 },
  name: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, marginBottom: 2 },
  fieldRow: { flexDirection: 'row', marginTop: 1.2 },
  fieldLabel: { width: 60, color: MUTED },
  fieldValue: { flex: 1, fontFamily: 'Helvetica-Bold' },
  plate: { alignSelf: 'flex-start', backgroundColor: '#F6C700', borderWidth: 1.5, borderColor: '#000', paddingVertical: 1, paddingHorizontal: 5, fontFamily: 'Courier-Bold', fontSize: 11, letterSpacing: 2, marginBottom: 2 },
  notes: { marginTop: 8, borderLeftWidth: 3, borderLeftColor: C.red, backgroundColor: '#F7F7F7', paddingVertical: 5, paddingHorizontal: 9 },
  notesTitle: { fontFamily: 'Courier-Bold', fontSize: 7, letterSpacing: 1.5, color: MUTED, marginBottom: 2 },
  bar: { marginTop: 11, paddingVertical: 2.5, fontFamily: 'Courier-Bold', fontSize: 9, letterSpacing: 2.5, color: '#FFF', textAlign: 'center' },
  th: { flexDirection: 'row', paddingVertical: 3, fontFamily: 'Courier-Bold', fontSize: 7 },
  tr: { flexDirection: 'row', paddingVertical: 2.2 },
  cCode: { width: 34, paddingLeft: 3, fontFamily: 'Courier', fontSize: 7.5, color: MUTED },
  cSection: { width: 72, paddingRight: 4, fontFamily: 'Helvetica-Bold', fontSize: 6.8 },
  cType: { width: 64, paddingLeft: 3, fontSize: 7.5, color: '#555' },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 28, textAlign: 'center' },
  cMoney: { width: 62, textAlign: 'right', paddingRight: 3 },
  subtotals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 5 },
  alert: { width: 250, borderLeftWidth: 3, borderLeftColor: '#D97706', backgroundColor: '#FFFBEB', paddingVertical: 5, paddingHorizontal: 8 },
  alertTitle: { fontFamily: 'Courier-Bold', fontSize: 7.5, color: '#92400E', letterSpacing: 0.8 },
  alertText: { fontSize: 8, color: '#78350F', marginTop: 1.5 },
  totals: { width: 210 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3, paddingHorizontal: 5 },
  grandWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  seal: { width: 50, height: 50, transform: 'rotate(-12deg)', opacity: 0.9, marginRight: 12 },
  grand: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.ink, borderLeftWidth: 7, borderLeftColor: C.red, paddingVertical: 9, paddingHorizontal: 10 },
  grandLabel: { fontFamily: 'Courier-Bold', fontSize: 8.5, color: '#FFF', letterSpacing: 1.2 },
  grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: '#FFF' },
  footer: { position: 'absolute', left: 36, right: 36, bottom: 18, borderTopWidth: 0.5, borderTopColor: '#BDBDBD', paddingTop: 4, fontSize: 7, color: MUTED, textAlign: 'center' },
  footerMono: { fontFamily: 'Courier', fontSize: 6.5, letterSpacing: 0.8, marginTop: 1 },
});

function Fields({ fields }: { fields: Field[] }) {
  return (
    <>
      {fields.map((f) => (
        <View key={f.label} style={s.fieldRow}>
          <Text style={s.fieldLabel}>{f.label}</Text>
          <Text style={s.fieldValue}>{clean(f.value)}</Text>
        </View>
      ))}
    </>
  );
}

function ExpiryLine({ label, date, state }: { label: string; date: string; state: ExpiryState }) {
  const color = state === 'expired' ? C.red : state === 'soon' ? '#B45309' : C.ink;
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label} vence</Text>
      <Text style={[s.fieldValue, { color }]}>
        {date}
        {state === 'expired' || state === 'soon' ? ` · ${EXPIRY_LABEL[state].toUpperCase()}` : ''}
      </Text>
    </View>
  );
}

function TotalRow({ label, value, strong, color, tint }: { label: string; value: string; strong?: boolean; color?: string; tint?: string }) {
  return (
    <View style={[s.tRow, tint ? { backgroundColor: tint } : {}]}>
      <Text style={strong ? { fontFamily: 'Helvetica-Bold', color: color ?? C.ink } : { color: MUTED }}>{label}</Text>
      <Text style={{ fontFamily: 'Helvetica-Bold', color: color ?? C.ink }}>{value}</Text>
    </View>
  );
}

function InvoiceDocument({ m, origin }: { m: InvoiceModel; origin: string }) {
  return (
    <Document title={`Misión Nº ${m.number}`} author={m.business.name} subject={m.statusLabel} language="es">
      <Page size="LETTER" style={s.page}>
        {/* CABECERA */}
        <View style={s.header}>
          <Image src={`${origin}/brand/agente.png`} style={s.logo} />
          <View style={{ flex: 1 }}>
            <Text style={s.brandTop}>SERVICIO SECRETO</Text>
            <Text style={s.brandName}>MOTORCYCLES</Text>
            {m.contactLine ? <Text style={s.contact}>{clean(m.contactLine)}</Text> : null}
          </View>
          <View>
            <Text style={s.docLabel}>DOCUMENTO DE MISIÓN</Text>
            <Text style={s.docNumber}>Nº {m.number}</Text>
            <Text style={[s.badge, m.isQuote ? { borderWidth: 1.2, borderColor: C.red, color: C.red } : { backgroundColor: C.red, color: '#FFF' }]}>
              {m.statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={s.strip}>
          <Image src={`${origin}/brand/lineas.png`} style={s.stripImg} />
        </View>
        <View style={s.ruleRed} />

        {/* CLIENTE / OBJETIVO / MISIÓN */}
        <View style={s.grid}>
          <View style={[s.col, { flex: 1.15 }]}>
            <Text style={s.blockTitle}>DATOS DEL CLIENTE</Text>
            <Text style={s.name}>{clean(m.client.name.toUpperCase())}</Text>
            <Fields fields={m.client.fields} />
          </View>
          <View style={[s.col, { flex: 1.15 }]}>
            <Text style={s.blockTitle}>DATOS DEL OBJETIVO</Text>
            <Text style={s.plate}>{m.vehicle.plate}</Text>
            {m.vehicle.title ? <Text style={[s.name, { fontSize: 9.5, marginTop: 2 }]}>{clean(m.vehicle.title.toUpperCase())}</Text> : null}
            {m.vehicle.details ? <Text style={{ color: MUTED, marginBottom: 1 }}>{clean(m.vehicle.details)}</Text> : null}
            {m.vehicle.soat.date ? <ExpiryLine label="SOAT" date={m.vehicle.soat.date} state={m.vehicle.soat.state} /> : null}
            {m.vehicle.tecno.date ? <ExpiryLine label="Tecno" date={m.vehicle.tecno.date} state={m.vehicle.tecno.state} /> : null}
          </View>
          <View style={[s.col, { paddingRight: 0 }]}>
            <Text style={s.blockTitle}>DOCUMENTO DE MISIÓN</Text>
            <Fields fields={m.mission} />
          </View>
        </View>

        {m.initialNotes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.notesTitle}>OBSERVACIONES INICIALES</Text>
            <Text>{clean(m.initialNotes)}</Text>
          </View>
        ) : null}

        {/* DETALLES (SERVICIOS) */}
        {m.serviceCount > 0 ? (
          <View>
            <Text style={[s.bar, { backgroundColor: C.services }]} minPresenceAhead={40}>
              DETALLES DE LA MISIÓN
            </Text>
            <View style={[s.th, { color: C.services }]}>
              <Text style={s.cCode}>ÍTEM</Text>
              <Text style={s.cSection}>SECCIÓN</Text>
              <Text style={s.cDesc}>DESCRIPCIÓN</Text>
              <Text style={s.cQty}>CANT.</Text>
              <Text style={s.cMoney}>PRECIO</Text>
              <Text style={s.cMoney}>TOTAL</Text>
            </View>
            {m.serviceRows.map((l, i) => (
              <View
                key={i}
                style={[
                  s.tr,
                  i % 2 ? { backgroundColor: C.servicesTint } : {},
                  l.firstOfSection && i > 0 ? { borderTopWidth: 0.75, borderTopColor: '#9DB2D1' } : {},
                ]}
                wrap={false}
              >
                <Text style={s.cCode}>{l.itemCode}</Text>
                <Text style={[s.cSection, { color: C.services }]}>{l.firstOfSection ? clean(l.section.toUpperCase()) : ''}</Text>
                <Text style={s.cDesc}>{clean(l.description)}</Text>
                <Text style={s.cQty}>{l.quantity}</Text>
                <Text style={s.cMoney}>{cop(l.price)}</Text>
                <Text style={s.cMoney}>{cop(l.quantity * l.price)}</Text>
              </View>
            ))}
            <View style={s.subtotals} wrap={false}>
              {m.discountPct > 0 ? (
                <View style={s.alert}>
                  <Text style={s.alertTitle}>¡ALERTA! PAGO EN EFECTIVO</Text>
                  <Text style={s.alertText}>Aplica un descuento especial del {m.discountPct}% sobre los servicios.</Text>
                  {m.business.discountNote ? <Text style={[s.alertText, { fontFamily: 'Helvetica-Bold' }]}>{clean(m.business.discountNote)}</Text> : null}
                </View>
              ) : (
                <View />
              )}
              <View style={s.totals}>
                <TotalRow label="Subtotal de servicios" value={cop(m.totals.subtotal)} />
                {m.discountPct > 0 ? <TotalRow label={`Descuento ${m.discountPct}%`} value={`- ${cop(m.totals.discount)}`} color={C.red} /> : null}
                <TotalRow label="Total de servicios" value={cop(m.totals.servicesTotal)} strong color={C.services} tint={C.servicesTint} />
              </View>
            </View>
          </View>
        ) : null}

        {/* RECURSOS */}
        {m.parts.length > 0 ? (
          <View>
            <Text style={[s.bar, { backgroundColor: C.parts }]} minPresenceAhead={40}>
              RECURSOS DE LA MISIÓN
            </Text>
            <View style={[s.th, { color: C.parts }]}>
              <Text style={s.cType}>TIPO</Text>
              <Text style={s.cDesc}>DESCRIPCIÓN</Text>
              <Text style={s.cQty}>CANT.</Text>
              <Text style={s.cMoney}>PRECIO</Text>
              <Text style={s.cMoney}>TOTAL</Text>
            </View>
            {m.parts.map((p, i) => (
              <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.partsTint } : {}]} wrap={false}>
                <Text style={s.cType}>{clean(p.type)}</Text>
                <Text style={s.cDesc}>{clean(p.description)}</Text>
                <Text style={s.cQty}>{p.quantity}</Text>
                <Text style={s.cMoney}>{cop(p.price)}</Text>
                <Text style={s.cMoney}>{cop(p.quantity * p.price)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1.2, borderTopColor: C.parts }} wrap={false}>
              <View style={s.totals}>
                <TotalRow label="Total de recursos" value={cop(m.totals.partsTotal)} strong color={C.parts} tint={C.partsTint} />
              </View>
            </View>
          </View>
        ) : null}

        {m.finalNotes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.notesTitle}>OBSERVACIONES FINALES</Text>
            <Text>{clean(m.finalNotes)}</Text>
          </View>
        ) : null}

        {/* COSTO TOTAL */}
        <View style={s.grandWrap} wrap={false}>
          <Image src={`${origin}/brand/sello.png`} style={s.seal} />
          <View style={s.grand}>
            <Text style={s.grandLabel}>COSTO TOTAL DE LA MISIÓN Nº {Number(m.number)}</Text>
            <Text style={s.grandValue}>{cop(m.totals.total)}</Text>
          </View>
        </View>

        {m.validityNote ? <Text style={{ marginTop: 10, fontSize: 8, textAlign: 'center' }}>{m.validityNote}</Text> : null}

        {/* PIE (se repite en cada página) */}
        <View style={s.footer} fixed>
          {m.business.footerNote ? <Text>{clean(m.business.footerNote)}</Text> : null}
          {m.business.address || m.business.city ? <Text>{clean([m.business.address, m.business.city].filter(Boolean).join(', '))}</Text> : null}
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
