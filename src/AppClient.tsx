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
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PortalPage } from './pages/PortalPage';
import { AdminPage } from './pages/AdminPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { BlogPage } from './pages/BlogPage';
import { BookDemoPage } from './pages/BookDemoPage';
import { BookDemoModal } from './components/BookDemoModal';
import { NewsletterStatusPage } from './pages/NewsletterStatusPage';
import { PartnersPage } from './pages/PartnersPage';
import { CharityPartnersPage } from './pages/CharityPartnersPage';
import { DeliveryPartnersPage } from './pages/DeliveryPartnersPage';
import { PartnerEmailVerifyPage } from './pages/PartnerEmailVerifyPage';
import { VerifyRecordPage } from './pages/VerifyRecordPage';
import { VerifyCredentialPage } from './pages/VerifyCredentialPage';
import { SupplierSubmitPage } from './pages/SupplierSubmitPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { OnboardingPage } from './pages/OnboardingPage';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  partnerOnly?: boolean;
}> = ({
  children,
  adminOnly = false,
  partnerOnly = false,
}) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  // If this route is restricted to admins only, redirect non-admins to the partner portal
  if (adminOnly && !isAdmin) {
    return <Navigate to="/portal" replace />;
  }

  // If this route is client/partner only, redirect administrators to the admin console
  if (partnerOnly && isAdmin) {
    return <Navigate to="/admin" replace />;
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
        <Route index element={<LandingPage />} />
        <Route path="solutions" element={<SolutionsRedirect />} />
        <Route path="job-reporting" element={<SolutionsRedirect />} />
        <Route path="workforce-assurance" element={<SolutionsRedirect />} />
        <Route path="jobs" element={<SolutionsRedirect />} />
        <Route path="carbon-emission" element={<SolutionsRedirect />} />
        <Route path="carbon" element={<SolutionsRedirect />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="licensing" element={<PartnerLicensingPage />} />
        <Route path="pricing" element={<PartnerLicensingPage />} />
        <Route path="souvenirs" element={<EventSouvenirPage />} />
        <Route path="public-tracker" element={<PublicTrackerPage />} />
        <Route path="track/:orderNumber" element={<PublicTrackerPage />} />
        <Route path="track" element={<PublicTrackerPage />} />
        <Route path="merch" element={<MerchStorePage />} />
        <Route path="charities/apply" element={<Navigate to="/partners/charities" replace />} />
        <Route path="charity/apply" element={<Navigate to="/partners/charities" replace />} />
        <Route path="newsletter" element={<NewsletterStatusPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="partners/charities" element={<CharityPartnersPage />} />
        <Route path="partners/delivery" element={<DeliveryPartnersPage />} />
        <Route path="partners/verify-email" element={<PartnerEmailVerifyPage />} />
        <Route path="verify/record" element={<VerifyRecordPage />} />
        <Route path="verify/credential/:id" element={<VerifyCredentialPage />} />
        <Route path="supply-chain/submit" element={<SupplierSubmitPage />} />
        <Route path="partnerships" element={<PartnersPage />} />
        <Route path="partner" element={<PartnersPage />} />
        <Route path="partner/drop" element={<PartnerLogoDropPage />} />
        <Route path="certificate/:id" element={<CertificateViewPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/success" element={<CheckoutPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
        <Route path="book-demo" element={<BookDemoPage />} />
        <Route path="demo" element={<BookDemoPage />} />
        <Route path="schedule-demo" element={<BookDemoPage />} />
        
        {/* Production Authentication & Self-Service Account Provisioning */}
        <Route path="create-account" element={<SignUpPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="register" element={<SignUpPage />} />
        <Route path="portal/create-account" element={<SignUpPage />} />
        <Route path="portal/sign-up" element={<SignUpPage />} />
        <Route path="portal/register" element={<SignUpPage />} />
        <Route path="portal/login" element={<LoginPage />} />
        <Route path="admin/login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="portal/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="portal/reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="portal/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="portal/onboarding"
          element={
            <ProtectedRoute partnerOnly>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="onboarding"
          element={
            <ProtectedRoute partnerOnly>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="portal"
          element={
            <ProtectedRoute partnerOnly>
              <PortalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="portal/transactions"
          element={
            <ProtectedRoute partnerOnly>
              <Navigate to="/portal?tab=transactions" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="portal/credentials"
          element={
            <ProtectedRoute partnerOnly>
              <Navigate to="/portal?tab=credentials" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="portal/workflow"
          element={
            <ProtectedRoute partnerOnly>
              <Navigate to="/portal?tab=workflow" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="portal/workflow/:id"
          element={
            <ProtectedRoute partnerOnly>
              <Navigate to="/portal?tab=workflow" replace />
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
        <BookDemoModal />
      </BrowserRouter>
    </AuthProvider>
  );
};
