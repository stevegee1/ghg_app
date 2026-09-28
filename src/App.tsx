import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { ScrollManager } from './components/ScrollManager';
import { LandingPage } from './pages/LandingPage';
import { MerchStorePage } from './pages/MerchStorePage';
import { EventSouvenirPage } from './pages/EventSouvenirPage';
import { PartnerLicensingPage } from './pages/PartnerLicensingPage';
import { PartnerLogoDropPage } from './pages/PartnerLogoDropPage';
import { PublicTrackerPage } from './pages/PublicTrackerPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/PortalPage';
import { AdminPage } from './pages/AdminPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { BlogPage } from './pages/BlogPage';
import { CertificateViewPage } from './pages/CertificateViewPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
};

const SolutionsRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }
  return <Navigate to={isAdmin ? '/admin' : '/portal'} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Flagship Google B2B Landing Page */}
        <Route index element={<LandingPage />} />
        
        {/* Primary Enterprise & Souvenir Portals */}
        <Route path="solutions" element={<SolutionsRedirect />} />
        <Route path="job-reporting" element={<SolutionsRedirect />} />
        <Route path="workforce-assurance" element={<SolutionsRedirect />} />
        <Route path="jobs" element={<SolutionsRedirect />} />
        <Route path="carbon-emission" element={<SolutionsRedirect />} />
        <Route path="carbon" element={<SolutionsRedirect />} />
        <Route path="licensing" element={<PartnerLicensingPage />} />
        <Route path="pricing" element={<PartnerLicensingPage />} />
        
        <Route path="souvenirs" element={<EventSouvenirPage />} />
        <Route path="merch" element={<MerchStorePage />} />
        
        <Route path="track" element={<PublicTrackerPage />} />
        <Route path="track/:orderNumber" element={<PublicTrackerPage />} />
        <Route path="public-tracker" element={<Navigate to="/track" replace />} />
        
        <Route path="transparency" element={<TransparencyPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="certificate" element={<CertificateViewPage />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="privacy" element={<Navigate to="/transparency" replace />} />
        <Route path="security" element={<Navigate to="/transparency" replace />} />
        <Route path="compliance" element={<Navigate to="/transparency" replace />} />
        <Route path="contract" element={<Navigate to="/transparency" replace />} />
        <Route path="blog" element={<BlogPage />} />
        
        {/* Canonical Authentication Routes */}
        <Route path="create-account" element={<SignUpPage />} />
        <Route path="sign-up" element={<Navigate to="/create-account" replace />} />
        <Route path="register" element={<Navigate to="/create-account" replace />} />
        
        <Route path="portal/login" element={<LoginPage />} />
        <Route path="admin/login" element={<Navigate to="/portal/login" replace />} />
        <Route path="login" element={<Navigate to="/portal/login" replace />} />
        
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="portal/forgot-password" element={<Navigate to="/forgot-password" replace />} />
        
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="portal/reset-password" element={<Navigate to="/reset-password" replace />} />
        
        <Route path="partner-logo-drop" element={<PartnerLogoDropPage />} />
        
        {/* Protected Partner Assurance Portal & Admin Console */}
        <Route path="portal/evidence" element={<Navigate to="/portal?tab=evidence" replace />} />
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
          <ScrollManager />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
