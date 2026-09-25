import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccountRoute, AdminRoute, HomeRoute, ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import LoginScreen from './screens/LoginScreen';
import LoadingScreen from './screens/LoadingScreen';
import MainMenu from './screens/MainMenu';
import ClientScreen from './screens/ClientScreen';
import OrdersScreen from './screens/orders/OrdersScreen';
import NewOrderScreen from './screens/orders/NewOrderScreen';
import OrderEditorScreen from './screens/orders/OrderEditorScreen';
import ClientPortal from './screens/portal/ClientPortal';
import ClientPortalPreview from './screens/portal/ClientPortalPreview';

// Pantallas que no se usan a diario: se descargan solo al abrirlas.
const AdminServicesScreen = lazy(() => import('./screens/AdminServicesScreen'));
const InvoiceScreen = lazy(() => import('./screens/invoice/InvoiceScreen'));
const SettingsScreen = lazy(() => import('./screens/settings/SettingsScreen'));
const ImportScreen = lazy(() => import('./screens/settings/ImportScreen'));

const staff = (el: ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;
const admin = (el: ReactNode) => <AdminRoute>{el}</AdminRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><LoginScreen /></PublicOnlyRoute>} />
            <Route path="/" element={<HomeRoute staff={<MainMenu />} client={<ClientPortal />} />} />
            <Route path="/clients" element={staff(<ClientScreen />)} />
            <Route path="/orders" element={staff(<OrdersScreen />)} />
            <Route path="/orders/new" element={staff(<NewOrderScreen />)} />
            <Route path="/orders/:id" element={staff(<OrderEditorScreen />)} />
            <Route path="/orders/:id/documento" element={<AccountRoute><InvoiceScreen /></AccountRoute>} />
            <Route path="/portal/:clientId" element={staff(<ClientPortalPreview />)} />
            <Route path="/services" element={admin(<AdminServicesScreen />)} />
            <Route path="/settings" element={admin(<SettingsScreen />)} />
            <Route path="/settings/import" element={admin(<ImportScreen />)} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
