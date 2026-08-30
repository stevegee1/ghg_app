import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { MerchStorePage } from './pages/MerchStorePage';
import { EventSouvenirPage } from './pages/EventSouvenirPage';
import { PartnerLicensingPage } from './pages/PartnerLicensingPage';
import { PublicTrackerPage } from './pages/PublicTrackerPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/PortalPage';
import { AdminPage } from './pages/AdminPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { AboutPage } from './pages/AboutPage';
import { BlogPage } from './pages/BlogPage';
import { CertificateViewPage } from './pages/CertificateViewPage';
import { SignUpPage } from './pages/SignUpPage';
import { JobReportingPage } from './pages/JobReportingPage';

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
        {/* Flagship Google B2B Landing Page */}
        <Route index element={<LandingPage />} />
        
        {/* Primary Enterprise & Souvenir Portals */}
        <Route path="licensing" element={<PartnerLicensingPage />} />
        <Route path="job-reporting" element={<JobReportingPage />} />
        <Route path="workforce-assurance" element={<JobReportingPage />} />
        <Route path="jobs" element={<JobReportingPage />} />
        <Route path="souvenirs" element={<EventSouvenirPage />} />
        <Route path="merch" element={<MerchStorePage />} />
        <Route path="public-tracker" element={<PublicTrackerPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="certificate" element={<CertificateViewPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="create-account" element={<SignUpPage />} />
        <Route path="register" element={<SignUpPage />} />
        <Route path="portal/login" element={<LoginPage />} />
        
        {/* Protected Partner Assurance Portal & Admin Console */}
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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
