import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChevronRight, DatabaseZap, Trash2, UserPlus } from 'lucide-react';
import { db, ADMIN_EMAILS } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessSettings } from '../../data/hooks';
import type { BusinessSettings, StaffUser } from '../../types';
import { ScreenHeader, Section, Spinner } from '../../components/ui';
import { inputClass, labelClass } from '../../components/formStyles';

export default function SettingsScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Configuración" onBack={() => navigate('/')} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <BusinessForm />
        <StaffManager />
        <Section title="Datos">
          <button
            type="button"
            onClick={() => navigate('/settings/import')}
            className="flex w-full items-center gap-3 rounded-lg bg-[#112240] p-4 text-left hover:bg-[#15294d]"
          >
            <DatabaseZap className="h-5 w-5 shrink-0 text-[#E63946]" />
            <span className="flex-1">
              <span className="block font-medium">Importar historial de Access</span>
              <span className="block text-xs text-gray-400">Clientes, motos, catálogo y misiones de SSM-DB.accdb</span>
            </span>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </Section>
      </main>
    </div>
  );
}

const BUSINESS_FIELDS: [keyof BusinessSettings, string, string][] = [
  ['name', 'Nombre comercial', ''],
  ['legalId', 'NIT / Cédula', ''],
  ['phone', 'Teléfono / WhatsApp', ''],
  ['email', 'Correo', ''],
  ['address', 'Dirección', ''],
  ['city', 'Ciudad', ''],
  ['instagram', 'Instagram', '@ssmotorcycles'],
  ['website', 'Sitio web', ''],
];

function BusinessForm() {
  const business = useBusinessSettings();
  const [form, setForm] = useState<BusinessSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!business.loading && !form) setForm(business.data);
  }, [business.loading, business.data, form]);

  if (!form) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const set = (patch: Partial<BusinessSettings>) => {
    setForm({ ...form, ...patch });
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    await setDoc(doc(db, 'settings', 'business'), { ...form, quoteValidityDays: Number(form!.quoteValidityDays) || 0 });
    setSaving(false);
    setSaved(true);
  }

  return (
    <Section title="Datos del taller en la factura">
      <div className="space-y-3 rounded-lg bg-[#112240] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {BUSINESS_FIELDS.map(([key, label, placeholder]) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                value={String(form[key] ?? '')}
                onChange={(e) => set({ [key]: e.target.value })}
                placeholder={placeholder}
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <div>
          <label className={labelClass}>Nota del descuento</label>
          <input value={form.discountNote} onChange={(e) => set({ discountNote: e.target.value })} className={inputClass} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <div>
            <label className={labelClass}>Validez de cotizaciones (días, 0 = no mostrar)</label>
            <input
              value={String(form.quoteValidityDays)}
              onChange={(e) => set({ quoteValidityDays: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              inputMode="numeric"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nota al pie</label>
            <input
              value={form.footerNote}
              onChange={(e) => set({ footerNote: e.target.value })}
              placeholder="Ej: Garantía de 30 días en mano de obra"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-emerald-300">Guardado</span>}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </Section>
  );
}

function StaffManager() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'users'), (snap) =>
        setStaff(
          snap.docs
            .map((d) => ({ email: d.id, role: d.data().role, name: d.data().name ?? '' }) as StaffUser)
            .sort((a, b) => a.email.localeCompare(b.email)),
        ),
      ),
    [],
  );

  async function add() {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Escribe un correo de Google válido.');
      return;
    }
    setError(null);
    await setDoc(doc(db, 'users', clean), {
      role,
      name: name.trim(),
      added_by: user?.email?.toLowerCase() ?? '',
      added_at: serverTimestamp(),
    });
    setEmail('');
    setName('');
    setRole('staff');
  }

  async function remove(u: StaffUser) {
    if (!window.confirm(`¿Quitar el acceso a ${u.email}?`)) return;
    await deleteDoc(doc(db, 'users', u.email));
  }

  return (
    <Section title="Personal autorizado">
      <div className="rounded-lg bg-[#112240] p-4">
        <p className="text-xs text-gray-400">
          Solo estas cuentas de Google pueden entrar a la app. Los dueños ({ADMIN_EMAILS.join(', ')}) siempre son
          administradores.
        </p>

        <ul className="mt-3 divide-y divide-white/10">
          {staff.length === 0 && <li className="py-2 text-sm text-gray-400">Aún no hay personal agregado.</li>}
          {staff.map((u) => (
            <li key={u.email} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{u.name || u.email}</p>
                {u.name && <p className="truncate text-xs text-gray-400">{u.email}</p>}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  u.role === 'admin' ? 'bg-[#E63946]/20 text-[#ff8a93]' : 'bg-white/10 text-gray-300'
                }`}
              >
                {u.role === 'admin' ? 'Admin' : 'Agente'}
              </span>
              <button type="button" onClick={() => void remove(u)} aria-label={`Quitar ${u.email}`} className="p-1 text-gray-500 hover:text-[#E63946]">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[2fr_1.3fr_auto_auto]">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@gmail.com" type="email" className={inputClass} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (opcional)" className={inputClass} />
          <select value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'admin')} className={inputClass}>
            <option value="staff" className="bg-[#0A192F]">Agente</option>
            <option value="admin" className="bg-[#0A192F]">Admin</option>
          </select>
          <button
            type="button"
            onClick={() => void add()}
            className="flex items-center justify-center gap-1.5 rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-semibold"
          >
            <UserPlus className="h-4 w-4" /> Agregar
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </Section>
  );
}
