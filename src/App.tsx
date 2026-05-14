import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PortalProvider } from './contexts/PortalContext';
import PortalLoader from './pages/PortalLoader';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';

const FolderDetailsPage = lazy(() => import('./pages/FolderDetailsPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
    <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortalProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admn" element={<Suspense fallback={<PageLoader />}><SuperAdminPage /></Suspense>} />
            <Route path="/:portalName" element={<PortalLoader />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="folder/:folderId" element={<Suspense fallback={<PageLoader />}><FolderDetailsPage /></Suspense>} />
            </Route>
          </Routes>
        </PortalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
