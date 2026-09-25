import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import { ArrowLeft, ChevronDown, Lock, Plus, Search, Settings, X } from 'lucide-react';
import { db } from '../firebase';
import { clientConverter, vehicleConverter } from '../firestoreConverters';
import { emptyClient, GENDER_OPTIONS, type Client, type Vehicle } from '../types';
import { inputClass, labelClass } from '../components/formStyles';
import AddProfessionDialog from './clients/AddProfessionDialog';
import AddVehicleDialog from './clients/AddVehicleDialog';
import VehicleDetailDialog from './clients/VehicleDetailDialog';

export default function ClientScreen() {
  const navigate = useNavigate();

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([]);

  const [client, setClient] = useState<Client | null>(null);
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<Vehicle | null>(null);
  const [showAddProfessionDialog, setShowAddProfessionDialog] = useState(false);
  const [expandedProfessionMenu, setExpandedProfessionMenu] = useState(false);

  const [clientIdInput, setClientIdInput] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [instagram, setInstagram] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = query(collection(db, 'clients')).withConverter(clientConverter);
    return onSnapshot(q, (snapshot) => setAllClients(snapshot.docs.map((d) => d.data())));
  }, []);

  // Enlace directo desde una misión: /clients?client=CEDULA
  useEffect(() => {
    const wanted = searchParams.get('client');
    if (!wanted || allClients.length === 0) return;
    const found = allClients.find((c) => c.id === wanted);
    if (found) selectClient(found);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClients, searchParams]);

  useEffect(() => {
    const q = query(collection(db, 'professions'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      setAvailableProfessions(
        snapshot.docs.map((d) => (d.data().name as string) ?? '').filter((n) => n.length > 0),
      );
    });
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const filteredClients = useMemo(() => {
    if (!isSearching) return [];
    const tokens = searchQuery.trim().toLowerCase().split(/\s+/);
    return allClients
      .filter((c) => tokens.every((t) => `${c.id} ${c.name} ${c.phone}`.toLowerCase().includes(t)))
      .slice(0, 5);
  }, [allClients, searchQuery, isSearching]);

  function selectClient(selected: Client) {
    setClient(selected);
    setClientIdInput(selected.id);
    setName(selected.name);
    setPhone(selected.phone);
    setEmail(selected.email);
    setAddress(selected.address);
    setCity(selected.city);
    setProfession(selected.profession);
    setInstagram(selected.instagram);
    setBirthDate(selected.birthDate);
    setGender(selected.gender);
    setIsNewClient(false);
    setSearchQuery('');
    setSaveError(null);

    setIsLoadingVehicles(true);
    getDocs(query(collection(db, 'vehicles'), where('client_id', '==', selected.id)).withConverter(vehicleConverter))
      .then((qs) => {
        setVehiclesList(qs.docs.map((d) => d.data()));
        setIsLoadingVehicles(false);
      })
      .catch(() => setIsLoadingVehicles(false));
  }

  function prepareNewClient() {
    setClient(null);
    setIsNewClient(true);
    setSearchQuery('');
    setClientIdInput('');
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setProfession('');
    setInstagram('');
    setBirthDate('');
    setGender('');
    setVehiclesList([]);
    setSaveError(null);
  }

  function clearSelection() {
    setClient(null);
    setIsNewClient(false);
    setClientIdInput('');
    setVehiclesList([]);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setProfession('');
    setInstagram('');
    setBirthDate('');
    setGender('');
  }

  async function handleSaveClient() {
    const id = clientIdInput.trim().replace(/\s+/g, '');
    if (!id) {
      setSaveError('La Cédula es obligatoria');
      return;
    }
    if (isNewClient && !/^[0-9A-Za-z.-]{3,20}$/.test(id)) {
      setSaveError('La cédula / NIT solo puede tener números, letras, puntos o guiones (3 a 20).');
      return;
    }
    setSaving(true);
    const clientToSave: Client = {
      ...emptyClient(),
      id,
      name,
      phone,
      email,
      address,
      city,
      profession,
      instagram,
      birthDate,
      gender,
    };
    try {
      await setDoc(doc(db, 'clients', id).withConverter(clientConverter), clientToSave, { merge: true });
      setSaveError(null);
      setClient(clientToSave);
      setClientIdInput(id);
      setIsNewClient(false);
    } catch (err) {
      console.error(err);
      setSaveError('No se pudo guardar el cliente. Revisa la conexión o tus permisos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <header className="flex items-center justify-between bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} aria-label="Volver" className="rounded p-1 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-medium">Gestión de Clientes</h1>
        </div>
        {client && (
          <button type="button" onClick={clearSelection} className="text-sm font-medium text-[#E63946]">
            Limpiar
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        {/* BUSCADOR */}
        <div className="relative z-10">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar Cédula o Nombre..."
              className={`${inputClass} pr-9`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            )}
          </div>

          {isSearching && filteredClients.length > 0 && (
            <div className="absolute mt-1 w-full overflow-hidden rounded-md bg-[#1E2D45] shadow-lg">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClient(c)}
                  className="block w-full border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/5"
                >
                  <p className="font-bold text-white">{c.name}</p>
                  <p className="text-sm text-gray-400">CC: {c.id}</p>
                </button>
              ))}
            </div>
          )}

          {isSearching && filteredClients.length === 0 && searchQuery.length > 3 && (
            <button
              type="button"
              onClick={prepareNewClient}
              className="mt-1 w-full rounded-md bg-[#E63946] py-3 text-sm font-medium text-white"
            >
              Cliente no encontrado. ¿Crear Nuevo?
            </button>
          )}
        </div>

        {/* FORMULARIO CLIENTE */}
        <div className="mt-6">
          <p className="text-sm text-gray-400">Datos del Cliente</p>
          <div className="mt-2 rounded-lg bg-[#112240] p-4">
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Cédula / NIT</label>
                <div className="relative">
                  <input
                    value={clientIdInput}
                    onChange={(e) => isNewClient && setClientIdInput(e.target.value)}
                    readOnly={!isNewClient}
                    inputMode="numeric"
                    className={`${inputClass} ${!isNewClient ? 'pr-9' : ''}`}
                  />
                  {!isNewClient && (
                    <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Nombre Completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={labelClass}>Teléfono</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Ciudad</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className={labelClass}>Profesión / Ocupación</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExpandedProfessionMenu((v) => !v)}
                      className={`${inputClass} flex items-center justify-between text-left`}
                    >
                      <span className={profession ? '' : 'text-gray-500'}>{profession || 'Seleccionar...'}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    {expandedProfessionMenu && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-700 bg-[#1E2D45] shadow-lg">
                        {availableProfessions.length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Sin profesiones registradas</p>
                        )}
                        {availableProfessions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setProfession(item);
                              setExpandedProfessionMenu(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProfessionDialog(true)}
                  aria-label="Nueva Profesión"
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-[#4CAF50]"
                >
                  <Plus className="h-5 w-5 text-white" />
                </button>
              </div>

              <div>
                <label className={labelClass}>Correo</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass}>Instagram</label>
                  <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha de nacimiento</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Género</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                    <option value="" className="bg-[#0A192F]">—</option>
                    {[...new Set([...GENDER_OPTIONS, gender].filter(Boolean))].map((g) => (
                      <option key={g} value={g} className="bg-[#0A192F]">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {saveError && <p className="mt-3 text-sm text-red-400">{saveError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              {!isNewClient && client && (
                <button type="button" onClick={prepareNewClient} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                  Cancelar / Nuevo
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSaveClient()}
                disabled={saving}
                className={`rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                  isNewClient ? 'bg-white text-black' : 'bg-[#4CAF50] text-white'
                }`}
              >
                {isNewClient ? 'CREAR CLIENTE' : 'ACTUALIZAR DATOS'}
              </button>
            </div>
          </div>
        </div>

        {/* LISTAS */}
        <div className="mt-8">
          {client && !isNewClient ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Vehículos del Cliente</h2>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleDialog(true)}
                  aria-label="Agregar vehículo"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E63946] text-white"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {isLoadingVehicles ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                ) : vehiclesList.length === 0 ? (
                  <p className="text-sm text-gray-400">Este cliente no tiene vehículos.</p>
                ) : (
                  vehiclesList.map((v) => (
                    <VehicleItemRow key={v.plate} vehicle={v} onClick={() => setSelectedVehicleForDetail(v)} />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white">Directorio de Clientes</h2>
              <p className="text-xs text-gray-400">Seleccione uno para ver detalles</p>
              <div className="mt-2 space-y-2">
                {allClients.map((c) => (
                  <ClientDirectoryRow key={c.id} client={c} onClick={() => selectClient(c)} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {showAddVehicleDialog && client && (
        <AddVehicleDialog
          clientId={client.id}
          onDismiss={() => setShowAddVehicleDialog(false)}
          onSave={() => {
            setShowAddVehicleDialog(false);
            selectClient(client);
          }}
        />
      )}

      {selectedVehicleForDetail && (
        <VehicleDetailDialog
          vehicle={selectedVehicleForDetail}
          allClients={allClients}
          onDismiss={() => setSelectedVehicleForDetail(null)}
          onUpdate={() => {
            setSelectedVehicleForDetail(null);
            if (client) selectClient(client);
          }}
        />
      )}

      {showAddProfessionDialog && (
        <AddProfessionDialog
          onDismiss={() => setShowAddProfessionDialog(false)}
          onSave={(newProf) => {
            setProfession(newProf);
            setShowAddProfessionDialog(false);
          }}
        />
      )}
    </div>
  );
}

function ClientDirectoryRow({ client, onClick }: { client: Client; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-lg bg-[#15202B] p-4 text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E63946] font-bold text-white">
        {client.name.charAt(0).toUpperCase() || '?'}
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-white">{client.name}</p>
        <p className="text-xs text-gray-400">CC: {client.id}</p>
        {client.phone && <p className="text-xs text-gray-400">Tel: {client.phone}</p>}
      </div>
    </button>
  );
}

function VehicleItemRow({ vehicle, onClick }: { vehicle: Vehicle; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-lg border border-white/10 bg-[#1E2D45] p-4 text-left"
    >
      <Settings className="h-5 w-5 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="truncate font-bold text-white">
          {vehicle.brand} {vehicle.line}
        </p>
        <p className="text-base font-bold text-[#E63946]">{vehicle.plate}</p>
      </div>
    </button>
  );
}
