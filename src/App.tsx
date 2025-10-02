import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PortalProvider } from './contexts/PortalContext';
import PortalLoader from './pages/PortalLoader';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortalProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/:portalName" element={<PortalLoader />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
          </Routes>
        </PortalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
