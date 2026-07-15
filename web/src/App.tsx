import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import LoginScreen from './screens/LoginScreen';
import MainMenu from './screens/MainMenu';
import AdminServicesScreen from './screens/AdminServicesScreen';
import ClientScreen from './screens/ClientScreen';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginScreen />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <AdminRoute>
                <AdminServicesScreen />
              </AdminRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
