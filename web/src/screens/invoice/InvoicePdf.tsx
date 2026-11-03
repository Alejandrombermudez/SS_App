import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { formatCOP as rawCOP } from '../../utils/format';
import { INVOICE, type ExpiryState, type InvoiceModel } from './invoiceModel';

// Este módulo se carga bajo demanda (import dinámico): la librería de PDF pesa bastante y solo
// se necesita al descargar o compartir el documento.
//
// Réplica de la factura de Access: Courier (la métrica de Courier New), mismos colores, mismas
// secciones y mismo orden. Las medidas están en puntos sobre una hoja Carta con márgenes de 18.

const C = INVOICE.color;
const W = INVOICE.cols;

// Las fuentes estándar de PDF (WinAnsi) no tienen espacios finos ni el signo menos de Intl.
const clean = (s: string) => s.replace(/[  ]/g, ' ').replace(/−/g, '-');
// Access muestra los pesos sin espacio: $210.000
const cop = (n: number) => clean(rawCOP(n)).replace(/\$\s+/, '$');

const REG = 'Courier';
const BOLD = 'Courier-Bold';

const s = StyleSheet.create({
  page: { paddingTop: 18, paddingBottom: 30, paddingHorizontal: 18, fontFamily: REG, fontSize: 10, color: C.text },
  bar12: { fontFamily: BOLD, fontSize: 12, lineHeight: 1, color: '#FFF', textAlign: 'center', paddingTop: 1, paddingBottom: 0.5 },
  center: { textAlign: 'center' },
  box: { backgroundColor: '#FFF', height: 13, justifyContent: 'center' },
  boxText: { textAlign: 'center', fontSize: 10, color: C.text },
  label: { fontFamily: BOLD, fontSize: 10, color: '#FFF', textAlign: 'center', height: 14, paddingTop: 1 },
  th: { flexDirection: 'row', backgroundColor: C.blueLight, height: 13, alignItems: 'center', marginTop: 2, marginHorizontal: 2 },
  thText: { fontFamily: BOLD, fontSize: 10, color: '#FFF' },
  tr: { flexDirection: 'row', marginHorizontal: 2, paddingVertical: 0.6, minHeight: 12.5 },
  cItem: { width: W.item, paddingLeft: 1 },
  cSection: { width: W.section, fontSize: 8, paddingTop: 0.9, paddingRight: 0.5 },
  cDesc: { width: W.desc, paddingRight: 4 },
  cQty: { width: W.qty, textAlign: 'center' },
  cPrice: { width: W.price, textAlign: 'right' },
  cTotal: { width: W.total, textAlign: 'right' },
  cType: { width: 74, paddingLeft: 1 },
  cDescParts: { width: 350, paddingRight: 4 },
});

function Labeled({ label, w, bold = true }: { label: string; w: number; bold?: boolean }) {
  return <Text style={{ width: w, fontFamily: bold ? BOLD : REG, fontSize: 10, color: C.text, paddingTop: 1.5 }}>{label}</Text>;
}

function Cell({ w, text, ml = 0, bold = false }: { w: number; text: string; ml?: number; bold?: boolean }) {
  return (
    <View style={[s.box, { width: w, marginLeft: ml }]}>
      <Text style={[s.boxText, bold ? { fontFamily: BOLD } : {}]}>{clean(text)}</Text>
    </View>
  );
}

/** Columna con rótulo blanco sobre la barra oscura y valor en caja blanca (datos del cliente). */
function Field({ w, label, value, bg }: { w: number; label: string; value: string; bg: string }) {
  return (
    <View style={{ width: w, backgroundColor: bg }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.box}>
        <Text style={s.boxText}>{clean(value)}</Text>
      </View>
    </View>
  );
}

function stateColor(state: ExpiryState): string {
  return state === 'expired' ? C.alert : state === 'soon' ? '#B45309' : C.text;
}

function InvoiceDocument({ m, origin }: { m: InvoiceModel; origin: string }) {
  const plateCols: [string, number, string][] = [
    ['Placa', 67, m.vehicle.plate],
    ['Marca', 104, m.vehicle.brand],
    ['Línea', 122, m.vehicle.line],
    ['Modelo', 81, m.vehicle.model],
    ['Cm3', 56, m.vehicle.cc],
    ['SOAT', 69, m.vehicle.soat],
    ['TECNO', 74, m.vehicle.tecno],
  ];

  return (
    <Document title={`Misión Nº ${m.number}`} author={m.business.name} subject={m.typeDoc} language="es">
      <Page size="LETTER" style={s.page}>
        {/* ENCABEZADO: franja oscura con el nombre, y fila de logos */}
        <View style={{ backgroundColor: C.dark }}>
          <Text style={s.bar12}>SERVICIO SECRETO MOTORCYCLES</Text>
          <View style={{ flexDirection: 'row', height: 85, padding: 2, paddingTop: 2 }}>
            <View style={{ width: 79, backgroundColor: '#FFF' }}>
              <Image src={`${origin}/brand/sello-caja.png`} style={{ width: 79, height: 79 }} />
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFF', marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Image src={`${origin}/brand/lineas.png`} style={{ width: 372, height: 50 }} />
            </View>
            <View style={{ width: 79, backgroundColor: '#FFF' }}>
              <Image src={`${origin}/brand/agente-tel.png`} style={{ width: 79, height: 79 }} />
            </View>
          </View>
        </View>

        {/* DATOS DEL CLIENTE */}
        <View style={{ backgroundColor: C.client, paddingBottom: 2 }}>
          <Text style={s.bar12}>DATOS DEL CLIENTE</Text>
          <View style={{ flexDirection: 'row', paddingHorizontal: 2, columnGap: 2 }}>
            <Field w={85} label="Cedula" value={m.client.id} bg={C.client} />
            <Field w={153} label="Nombre" value={m.client.firstName} bg={C.client} />
            <Field w={157} label="Apellido" value={m.client.lastName} bg={C.client} />
            <Field w={85} label="Nacimiento" value={m.client.birth} bg={C.client} />
            <Field w={81} label="Teléfono" value={m.client.phone} bg={C.client} />
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 2, columnGap: 2, marginTop: 1 }}>
            <Field w={254} label="Google ID" value={m.client.email} bg={C.client} />
            <Field w={141} label="Instagram" value={m.client.instagram} bg={C.client} />
            <Field w={169} label="Profesión" value={m.client.profession} bg={C.client} />
          </View>
        </View>

        {/* DATOS DEL OBJETIVO */}
        <View style={{ backgroundColor: C.objective }}>
          <Text style={s.bar12}>DATOS DEL OBJETIVO</Text>
          <View style={{ flexDirection: 'row' }}>
            {plateCols.map(([label, w]) => (
              <Text key={label} style={[s.label, { width: w, height: 13 }]}>
                {label}
              </Text>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: '#FFF', height: 15, paddingTop: 1 }}>
          {plateCols.map(([label, w, value]) => (
            <Text
              key={label}
              style={[
                s.boxText,
                { width: w, paddingTop: 1 },
                label === 'SOAT' ? { color: stateColor(m.vehicle.soatState) } : {},
                label === 'TECNO' ? { color: stateColor(m.vehicle.tecnoState) } : {},
              ]}
            >
              {clean(value)}
            </Text>
          ))}
        </View>

        {/* DOCUMENTO DE MISIÓN */}
        <Text style={[s.bar12, { backgroundColor: C.docBar, color: C.text, marginTop: 0 }]}>DOCUMENTO DE MISIÓN</Text>
        <View style={{ backgroundColor: C.body, paddingTop: 2, paddingBottom: 2 }}>
          <View style={{ flexDirection: 'row', paddingLeft: 1 }}>
            <Labeled label="Documento" w={62} />
            <Cell w={36} text={m.number} />
            <Labeled label="Tipo Doc:" w={61} />
            <Cell w={119} text={m.typeDoc} />
            <Labeled label="Kilometraje" w={78} />
            <Cell w={65} text={m.mission.km} />
            <Labeled label="Servicio:" w={58} />
            <Cell w={88} text={m.mission.service} />
          </View>
          <View style={{ flexDirection: 'row', paddingLeft: 3, marginTop: 1 }}>
            <Labeled label="OBSERVACIONES INICIALES:" w={146} />
            <View style={[s.box, { width: 424 }]}>
              <Text style={{ fontFamily: BOLD, fontSize: 10, paddingLeft: 2 }}>{m.mission.entry}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#FFF', marginHorizontal: 2, marginTop: 1, paddingLeft: 1, minHeight: 13 }}>
            <Text>{clean(m.initialNotes)}</Text>
          </View>
        </View>

        {/* DETALLES DE LA MISIÓN */}
        {m.rows.length > 0 ? (
          <View style={{ backgroundColor: C.body, paddingTop: 0 }}>
            <Text style={[s.bar12, { backgroundColor: C.blue, marginTop: 2 }]} minPresenceAhead={60}>
              DETALLES DE LA MISIÓN
            </Text>
            <View style={{ backgroundColor: '#FFF' }}>
              <View style={s.th}>
                <Text style={[s.thText, s.cItem]}>Item</Text>
                <Text style={[s.thText, s.cSection]}>Sección</Text>
                <Text style={[s.thText, s.cDesc]}>Descripción</Text>
                <Text style={[s.thText, s.cQty]}>Cant.</Text>
                <Text style={[s.thText, s.cPrice]}>Precio</Text>
                <Text style={[s.thText, s.cTotal]}>Total</Text>
              </View>
              {m.rows.map((l, i) => (
                <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.blueRow } : {}]} wrap={false}>
                  <Text style={s.cItem}>{l.itemCode}</Text>
                  <Text style={s.cSection}>{clean(l.section)}</Text>
                  <Text style={s.cDesc}>{clean(l.description)}</Text>
                  <Text style={s.cQty}>{l.quantity}</Text>
                  <Text style={s.cPrice}>{cop(l.price)}</Text>
                  <Text style={s.cTotal}>{cop(l.quantity * l.price)}</Text>
                </View>
              ))}
              <View style={{ height: 3 }} />
            </View>

            {/* Subtotal / descuento / total de servicios */}
            <View style={{ flexDirection: 'row', backgroundColor: '#FFF' }} wrap={false}>
              <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 8 }}>
                {m.discountPct > 0 ? (
                  <>
                    <Text style={{ fontFamily: BOLD, fontSize: 9, color: C.dark }}>
                      ¡ALERTA! Para pago en efectivo aplica este descuento especial =&gt;
                    </Text>
                    {m.business.discountNote ? (
                      <Text style={{ fontSize: 8, color: C.dark, textAlign: 'center', marginTop: 3 }}>**{clean(m.business.discountNote)}**</Text>
                    ) : null}
                  </>
                ) : null}
              </View>
              <View style={{ width: 205 }}>
                <View style={{ flexDirection: 'row', backgroundColor: C.blueLight, height: 13, alignItems: 'center' }}>
                  <Text style={{ width: 135, textAlign: 'right', fontFamily: BOLD, color: '#FFF', paddingRight: 3 }}>Subtotal de Servicios:</Text>
                  <Text style={{ width: 70, textAlign: 'right', fontFamily: BOLD, color: '#FFF', paddingRight: 1 }}>{cop(m.totals.subtotal)}</Text>
                </View>
                {m.discountPct > 0 ? (
                  <View style={{ flexDirection: 'row', backgroundColor: C.blueRow, height: 16, alignItems: 'center' }}>
                    <Text style={{ width: 135, textAlign: 'right', fontFamily: BOLD, fontSize: 14, color: '#000', paddingRight: 3 }}>
                      Descuento {m.discountPct}%:
                    </Text>
                    <Text style={{ width: 70, textAlign: 'right', fontFamily: BOLD, fontSize: 14, color: '#000', paddingRight: 1 }}>
                      {cop(m.totals.discount)}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', backgroundColor: C.blue, height: 13, alignItems: 'center' }}>
                  <Text style={{ width: 135, textAlign: 'right', fontFamily: BOLD, color: '#FFF', paddingRight: 3 }}>Total de Servicios:</Text>
                  <Text style={{ width: 70, textAlign: 'right', fontFamily: BOLD, color: '#FFF', paddingRight: 1 }}>{cop(m.totals.servicesTotal)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* RECURSOS DE LA MISIÓN */}
        {m.parts.length > 0 ? (
          <View style={{ backgroundColor: C.body }}>
            <Text style={[s.bar12, { backgroundColor: C.green }]} minPresenceAhead={50}>
              RECURSOS DE LA MISIÓN
            </Text>
            <View style={{ backgroundColor: '#FFF' }}>
              <View style={[s.th, { backgroundColor: C.greenLight }]}>
                <Text style={[s.thText, s.cType]}>Tipo</Text>
                <Text style={[s.thText, s.cDescParts]}>Descripción</Text>
                <Text style={[s.thText, s.cQty]}>Cant.</Text>
                <Text style={[s.thText, s.cPrice]}>Precio</Text>
                <Text style={[s.thText, s.cTotal]}>Total</Text>
              </View>
              {m.parts.map((p, i) => (
                <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.greenRow } : {}]} wrap={false}>
                  <Text style={s.cType}>{clean(p.type)}</Text>
                  <Text style={s.cDescParts}>{clean(p.description)}</Text>
                  <Text style={s.cQty}>{p.quantity}</Text>
                  <Text style={s.cPrice}>{cop(p.price)}</Text>
                  <Text style={s.cTotal}>{cop(p.quantity * p.price)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3 }} wrap={false}>
                <View style={{ flexDirection: 'row', width: 205, backgroundColor: C.greenLight, height: 13, alignItems: 'center' }}>
                  <Text style={{ width: 135, textAlign: 'right', fontFamily: BOLD, color: '#FFF', paddingRight: 3 }}>Total de Recursos:</Text>
                  <Text style={{ width: 70, textAlign: 'right', fontFamily: BOLD, color: '#FFF', paddingRight: 1 }}>{cop(m.totals.partsTotal)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* OBSERVACIONES FINALES + COSTO TOTAL */}
        <View style={{ backgroundColor: C.body, paddingTop: 2 }} wrap={false}>
          <View style={{ backgroundColor: '#FFF', width: 139, marginLeft: 3, height: 13, justifyContent: 'center' }}>
            <Text style={{ fontFamily: BOLD, color: C.dark, paddingLeft: 1 }}>OBSERVACIONES FINALES:</Text>
          </View>
          <View style={{ backgroundColor: '#FFF', marginHorizontal: 3, marginTop: 1, minHeight: 26, paddingLeft: 1 }}>
            <Text>{clean(m.finalNotes)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 26, marginTop: 2 }}>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, color: C.dark }}>Costo Total de la Misión No.{m.number}:</Text>
            <Text style={{ width: 120, textAlign: 'right', fontFamily: BOLD, fontSize: 14, color: C.dark, paddingRight: 2 }}>
              {cop(m.totals.total)}
            </Text>
          </View>
        </View>

        {m.validityNote ? <Text style={{ marginTop: 4, fontSize: 8, textAlign: 'center' }}>{m.validityNote}</Text> : null}

        <View style={{ position: 'absolute', left: 18, right: 18, bottom: 12 }} fixed>
          <Text
            style={{ fontSize: 7, color: '#8A8A8A', textAlign: 'center' }}
            render={({ pageNumber, totalPages }) => `Misión Nº ${m.number} · Generado el ${m.generatedOn} · Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(m: InvoiceModel, origin: string): Promise<Blob> {
  return pdf(<InvoiceDocument m={m} origin={origin} />).toBlob();
}
