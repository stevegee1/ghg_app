import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { PartnerLicensingPage } from './pages/PartnerLicensingPage';
import { EventSouvenirPage } from './pages/EventSouvenirPage';
import { PublicTrackerPage } from './pages/PublicTrackerPage';
import { MerchStorePage } from './pages/MerchStorePage';
import { PartnerLogoDropPage } from './pages/PartnerLogoDropPage';
import { CertificateViewPage } from './pages/CertificateViewPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/PortalPage';
import { AdminPage } from './pages/AdminPage';
import { TransparencyPage } from './pages/TransparencyPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="licensing" element={<PartnerLicensingPage />} />
        <Route path="souvenirs" element={<EventSouvenirPage />} />
        <Route path="public-tracker" element={<PublicTrackerPage />} />
        <Route path="merch" element={<MerchStorePage />} />
        <Route path="partner/drop" element={<PartnerLogoDropPage />} />
        <Route path="certificate/:id" element={<CertificateViewPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
        <Route path="portal/login" element={<LoginPage />} />
        <Route path="admin/login" element={<LoginPage />} />
        <Route
          path="portal"
          element={
            <ProtectedRoute>
              <PortalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export const AppClient: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};
