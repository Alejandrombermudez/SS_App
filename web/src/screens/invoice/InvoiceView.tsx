import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatCOP as rawCOP } from '../../utils/format';
import { INVOICE, type ExpiryState, type InvoiceModel } from './invoiceModel';

const C = INVOICE.color;
const W = INVOICE.cols;
const PAGE_W = 609; // 573 de contenido + márgenes de 18, igual que la hoja Carta del original
const MONO = '"Courier New", Courier, monospace';

// Access muestra los pesos sin espacio: $210.000
const cop = (n: number) => rawCOP(n).replace(/\$\s+/, '$');

/**
 * Documento de misión en pantalla. Es una réplica de la factura de Access (mismo orden, colores y
 * tipografía Courier New) dibujada a su tamaño real y escalada para ajustarse al ancho del
 * dispositivo, así se ve igual en el celular que impreso.
 */
export default function InvoiceView({ m }: { m: InvoiceModel }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const k = Math.min(1.35, outer.current.clientWidth / PAGE_W);
      setScale(k);
      setHeight(inner.current.offsetHeight * k);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [m]);

  return (
    <div ref={outer} className="invoice-outer mx-auto w-full max-w-[860px]" style={{ height }}>
      <div
        ref={inner}
        className="invoice-paper bg-white shadow-xl"
        style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left', fontFamily: MONO, fontSize: 10, color: C.text, padding: 18 }}
      >
        <Header />
        <ClientBlock m={m} />
        <ObjectiveBlock m={m} />
        <MissionBlock m={m} />
        {m.rows.length > 0 && <Details m={m} />}
        {m.parts.length > 0 && <Resources m={m} />}
        <Closing m={m} />
        {m.validityNote && <p style={{ marginTop: 4, fontSize: 8, textAlign: 'center' }}>{m.validityNote}</p>}
      </div>
    </div>
  );
}

const bar = (bg: string, color = '#FFF'): CSSProperties => ({
  backgroundColor: bg,
  color,
  fontWeight: 700,
  fontSize: 12,
  lineHeight: '13px',
  textAlign: 'center',
  padding: '0 0 1px',
});

const box: CSSProperties = { backgroundColor: '#FFF', height: 13, lineHeight: '13px', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
const label: CSSProperties = { color: '#FFF', fontWeight: 700, textAlign: 'center', height: 14, lineHeight: '14px' };

function Header() {
  return (
    <div style={{ backgroundColor: C.dark }}>
      <div style={bar(C.dark)}>SERVICIO SECRETO MOTORCYCLES</div>
      <div style={{ display: 'flex', gap: 2, padding: 2, height: 85 }}>
        <div style={{ width: 79, backgroundColor: '#FFF' }}>
          <img src="/brand/sello-caja.png" alt="Servicio Secreto Motorcycles" width={79} height={79} />
        </div>
        <div style={{ flex: 1, backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/brand/lineas.png" alt="Offroad · Road of City · Sportbike · Adventure · Custom" style={{ width: 372, height: 50 }} />
        </div>
        <div style={{ width: 79, backgroundColor: '#FFF' }}>
          <img src="/brand/agente-tel.png" alt="+57 302 612 8712" width={79} height={79} />
        </div>
      </div>
    </div>
  );
}

function Field({ w, label: l, value }: { w: number; label: string; value: string }) {
  return (
    <div style={{ width: w }}>
      <div style={label}>{l}</div>
      <div style={box}>{value}</div>
    </div>
  );
}

function ClientBlock({ m }: { m: InvoiceModel }) {
  return (
    <div style={{ backgroundColor: C.client, paddingBottom: 2 }}>
      <div style={bar(C.client)}>DATOS DEL CLIENTE</div>
      <div style={{ display: 'flex', gap: 2, padding: '0 2px' }}>
        <Field w={85} label="Cedula" value={m.client.id} />
        <Field w={153} label="Nombre" value={m.client.firstName} />
        <Field w={157} label="Apellido" value={m.client.lastName} />
        <Field w={85} label="Nacimiento" value={m.client.birth} />
        <Field w={81} label="Teléfono" value={m.client.phone} />
      </div>
      <div style={{ display: 'flex', gap: 2, padding: '1px 2px 0' }}>
        <Field w={254} label="Google ID" value={m.client.email} />
        <Field w={141} label="Instagram" value={m.client.instagram} />
        <Field w={169} label="Profesión" value={m.client.profession} />
      </div>
    </div>
  );
}

const stateColor = (s: ExpiryState) => (s === 'expired' ? C.alert : s === 'soon' ? '#B45309' : C.text);

function ObjectiveBlock({ m }: { m: InvoiceModel }) {
  const cols: [string, number, string, string?][] = [
    ['Placa', 67, m.vehicle.plate],
    ['Marca', 104, m.vehicle.brand],
    ['Línea', 122, m.vehicle.line],
    ['Modelo', 81, m.vehicle.model],
    ['Cm3', 56, m.vehicle.cc],
    ['SOAT', 69, m.vehicle.soat, stateColor(m.vehicle.soatState)],
    ['TECNO', 74, m.vehicle.tecno, stateColor(m.vehicle.tecnoState)],
  ];
  return (
    <>
      <div style={{ backgroundColor: C.objective }}>
        <div style={bar(C.objective)}>DATOS DEL OBJETIVO</div>
        <div style={{ display: 'flex' }}>
          {cols.map(([l, w]) => (
            <div key={l} style={{ ...label, width: w, height: 13, lineHeight: '13px' }}>
              {l}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', backgroundColor: '#FFF', height: 15, lineHeight: '15px' }}>
        {cols.map(([l, w, v, color]) => (
          <div key={l} style={{ width: w, textAlign: 'center', color: color ?? C.text }}>
            {v}
          </div>
        ))}
      </div>
    </>
  );
}

function LabelText({ w, children }: { w: number; children: string }) {
  return <div style={{ width: w, fontWeight: 700, lineHeight: '13px', paddingTop: 1, whiteSpace: 'nowrap' }}>{children}</div>;
}

function MissionBlock({ m }: { m: InvoiceModel }) {
  return (
    <>
      <div style={bar(C.docBar, C.text)}>DOCUMENTO DE MISIÓN</div>
      <div style={{ backgroundColor: C.body, padding: '2px 0' }}>
        <div style={{ display: 'flex', paddingLeft: 1 }}>
          <LabelText w={62}>Documento</LabelText>
          <div style={{ ...box, width: 36 }}>{m.number}</div>
          <LabelText w={61}>Tipo Doc:</LabelText>
          <div style={{ ...box, width: 119 }}>{m.typeDoc}</div>
          <LabelText w={78}>Kilometraje</LabelText>
          <div style={{ ...box, width: 65 }}>{m.mission.km}</div>
          <LabelText w={58}>Servicio:</LabelText>
          <div style={{ ...box, width: 88 }}>{m.mission.service}</div>
        </div>
        <div style={{ display: 'flex', paddingLeft: 3, marginTop: 1 }}>
          <LabelText w={146}>OBSERVACIONES INICIALES:</LabelText>
          <div style={{ ...box, width: 424, textAlign: 'left', paddingLeft: 2, fontWeight: 700 }}>{m.mission.entry}</div>
        </div>
        <div style={{ backgroundColor: '#FFF', margin: '1px 2px 0', paddingLeft: 1, minHeight: 13, whiteSpace: 'pre-wrap' }}>{m.initialNotes}</div>
      </div>
    </>
  );
}

function Head({ children, bg }: { children: ReactNode; bg: string }) {
  return (
    <div style={{ display: 'flex', backgroundColor: bg, color: '#FFF', fontWeight: 700, height: 13, lineHeight: '13px', margin: '2px 2px 0' }}>
      {children}
    </div>
  );
}

const td = (w: number, extra?: CSSProperties): CSSProperties => ({ width: w, flexShrink: 0, ...extra });

function SumRow({ w1, w2, bg, label: l, value, big = false, color = '#FFF' }: { w1: number; w2: number; bg: string; label: string; value: string; big?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', backgroundColor: bg, color, fontWeight: 700, fontSize: big ? 14 : 10, height: big ? 16 : 13, lineHeight: big ? '16px' : '13px' }}>
      <div style={{ width: w1, textAlign: 'right', paddingRight: 2, whiteSpace: 'nowrap' }}>{l}</div>
      <div style={{ width: w2, textAlign: 'right', paddingRight: 1, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function Details({ m }: { m: InvoiceModel }) {
  return (
    <div style={{ backgroundColor: C.body }}>
      <div style={{ ...bar(C.blue), marginTop: 2 }}>DETALLES DE LA MISIÓN</div>
      <div style={{ backgroundColor: '#FFF' }}>
        <Head bg={C.blueLight}>
          <div style={td(W.item, { paddingLeft: 1 })}>Item</div>
          <div style={td(W.section)}>Sección</div>
          <div style={td(W.desc)}>Descripción</div>
          <div style={td(W.qty, { textAlign: 'center' })}>Cant.</div>
          <div style={td(W.price, { textAlign: 'right' })}>Precio</div>
          <div style={td(W.total, { textAlign: 'right' })}>Total</div>
        </Head>
        {m.rows.map((l, i) => (
          <div key={i} style={{ display: 'flex', margin: '0 2px', minHeight: 12.5, lineHeight: '12.5px', backgroundColor: i % 2 ? C.blueRow : undefined }}>
            <div style={td(W.item, { paddingLeft: 1 })}>{l.itemCode}</div>
            <div style={td(W.section, { fontSize: 8, paddingRight: 1 })}>{l.section}</div>
            <div style={td(W.desc, { paddingRight: 4 })}>{l.description}</div>
            <div style={td(W.qty, { textAlign: 'center' })}>{l.quantity}</div>
            <div style={td(W.price, { textAlign: 'right' })}>{cop(l.price)}</div>
            <div style={td(W.total, { textAlign: 'right' })}>{cop(l.quantity * l.price)}</div>
          </div>
        ))}
        <div style={{ height: 3 }} />
      </div>
      <div style={{ display: 'flex', backgroundColor: '#FFF' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 8, color: C.dark }}>
          {m.discountPct > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 9 }}>¡ALERTA! Para pago en efectivo aplica este descuento especial =&gt;</div>
              {m.business.discountNote && <div style={{ fontSize: 8, textAlign: 'center', marginTop: 3 }}>**{m.business.discountNote}**</div>}
            </>
          )}
        </div>
        <div style={{ width: 205 }}>
          <SumRow w1={135} w2={70} bg={C.blueLight} label="Subtotal de Servicios:" value={cop(m.totals.subtotal)} />
          {m.discountPct > 0 && (
            <SumRow w1={135} w2={70} bg={C.blueRow} color="#000" big label={`Descuento ${m.discountPct}%:`} value={cop(m.totals.discount)} />
          )}
          <SumRow w1={135} w2={70} bg={C.blue} label="Total de Servicios:" value={cop(m.totals.servicesTotal)} />
        </div>
      </div>
    </div>
  );
}

function Resources({ m }: { m: InvoiceModel }) {
  return (
    <div style={{ backgroundColor: C.body }}>
      <div style={bar(C.green)}>RECURSOS DE LA MISIÓN</div>
      <div style={{ backgroundColor: '#FFF' }}>
        <Head bg={C.greenLight}>
          <div style={td(74, { paddingLeft: 1 })}>Tipo</div>
          <div style={td(350)}>Descripción</div>
          <div style={td(W.qty, { textAlign: 'center' })}>Cant.</div>
          <div style={td(W.price, { textAlign: 'right' })}>Precio</div>
          <div style={td(W.total, { textAlign: 'right' })}>Total</div>
        </Head>
        {m.parts.map((p, i) => (
          <div key={i} style={{ display: 'flex', margin: '0 2px', minHeight: 12.5, lineHeight: '12.5px', backgroundColor: i % 2 ? C.greenRow : undefined }}>
            <div style={td(74, { paddingLeft: 1 })}>{p.type}</div>
            <div style={td(350, { paddingRight: 4 })}>{p.description}</div>
            <div style={td(W.qty, { textAlign: 'center' })}>{p.quantity}</div>
            <div style={td(W.price, { textAlign: 'right' })}>{cop(p.price)}</div>
            <div style={td(W.total, { textAlign: 'right' })}>{cop(p.quantity * p.price)}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
          <div style={{ width: 205 }}>
            <SumRow w1={135} w2={70} bg={C.greenLight} label="Total de Recursos:" value={cop(m.totals.partsTotal)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Closing({ m }: { m: InvoiceModel }) {
  return (
    <div style={{ backgroundColor: C.body, paddingTop: 2 }}>
      <div style={{ backgroundColor: '#FFF', width: 139, marginLeft: 3, height: 13, lineHeight: '13px', fontWeight: 700, color: C.dark, paddingLeft: 1 }}>
        OBSERVACIONES FINALES:
      </div>
      <div style={{ backgroundColor: '#FFF', margin: '1px 3px 0', minHeight: 26, paddingLeft: 1, whiteSpace: 'pre-wrap' }}>{m.finalNotes}</div>
      <div style={{ display: 'flex', alignItems: 'center', height: 26, marginTop: 2, color: C.dark, fontSize: 14 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>Costo Total de la Misión No.{m.number}:</div>
        <div style={{ width: 120, textAlign: 'right', fontWeight: 700, paddingRight: 2 }}>{cop(m.totals.total)}</div>
      </div>
    </div>
  );
}
