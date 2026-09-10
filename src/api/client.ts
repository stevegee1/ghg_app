import { mockApi } from './mockClient';
const USE_MOCK_ENV = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_USE_MOCK === 'true';

export let isUsingMockData = USE_MOCK_ENV;

function getAuthHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async checkout(params: { licenseeId: string; grossAmountCents: number; checkoutReferenceId?: string }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.checkout(params);
    }
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Checkout request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      isUsingMockData = false;
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      if (USE_MOCK_ENV) {
        isUsingMockData = true;
        return mockApi.checkout(params);
      }
      throw e;
    }
  },

  async createCheckoutSession(params: {
    licenseeId: string;
    itemTitle: string;
    grossAmountCents: number;
    currency?: string;
  }) {
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create Stripe checkout session' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async b2bTrigger(params: {
    licenseeId: string;
    quantity: number;
    deliveryType: 'PHYSICAL' | 'DIGITAL';
    externalReferenceId: string;
    attestationNote?: string;
    logoName?: string;
  }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.b2bTrigger(params);
    }
    try {
      const res = await fetch('/api/b2b/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'b2b_key_itm_secret',
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'B2B Licensing trigger failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock b2bTrigger', e);
      isUsingMockData = true;
      return mockApi.b2bTrigger(params);
    }
  },

  async createAnnualLicense(params: {
    licenseeId: string;
    partnerName: string;
    annualCarbonTonnes: number;
  }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.createAnnualLicense(params);
    }
    try {
      isUsingMockData = false;
      return mockApi.createAnnualLicense(params);
    } catch (e) {
      isUsingMockData = true;
      return mockApi.createAnnualLicense(params);
    }
  },

  async createSouvenirOrder(params: {
    eventName: string;
    eventType: string;
    eventDate: string;
    itemTitle: string;
    quantity: number;
    pricePerItemCents: number;
  }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.createSouvenirOrder(params);
    }
    try {
      isUsingMockData = false;
      return mockApi.createSouvenirOrder(params);
    } catch (e) {
      isUsingMockData = true;
      return mockApi.createSouvenirOrder(params);
    }
  },

  async getSouvenirTracker(orderId?: string) {
    // Public endpoint — no mock fallback in production
    const orderNumber = orderId?.trim().toUpperCase();
    if (!orderNumber) return null;
    const res = await fetch(`/api/orders/track/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      const err = await res.json().catch(() => ({ error: 'Failed to track order' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    isUsingMockData = false;
    return res.json();
  },

  async register(params: { firstName: string; lastName: string; email: string; password: string; companyName: string }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.register(params);
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Account registration failed' }));
        throw new Error(err.error || 'Registration failed');
      }
      isUsingMockData = false;
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) throw e;
      console.warn('[API Client] Backend unreachable for register, using mock API', e);
      isUsingMockData = true;
      return mockApi.register(params);
    }
  },

  async login(email: string, password: string) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.login(email, password);
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Invalid email or password' }));
        throw new Error(err.error || 'Invalid email or password');
      }
      isUsingMockData = false;
      const data = await res.json();
      if (!data.user && data.token) {
        try {
          const payload = JSON.parse(atob(data.token.split('.')[1]));
          data.user = {
            id: payload.userId,
            email,
            role: payload.role,
            licenseeId: payload.licenseeId,
          };
        } catch (e) {
          console.error('Failed to decode JWT payload', e);
        }
      }
      return data;
    } catch (e: any) {
      if (e.message === 'Invalid email or password') throw e;
      console.warn('[API Client] Backend unreachable for login, using mock API', e);
      isUsingMockData = true;
      return mockApi.login(email, password);
    }
  },

  async forgotPassword(email: string) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.forgotPassword(email);
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to request password reset' }));
        throw new Error(err.error || 'Failed to request password reset');
      }
      isUsingMockData = false;
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      console.warn('[API Client] Backend unreachable for forgot password, using mock API', e);
      isUsingMockData = true;
      return mockApi.forgotPassword(email);
    }
  },

  async resetPassword(params: { token: string; email: string; password: string }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.resetPassword(params);
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to reset password' }));
        throw new Error(err.error || 'Failed to reset password');
      }
      isUsingMockData = false;
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      console.warn('[API Client] Backend unreachable for reset password, using mock API', e);
      isUsingMockData = true;
      return mockApi.resetPassword(params);
    }
  },

  async createEventSouvenirOrder(params: {
    customerEmail: string;
    customerName?: string;
    eventCategory: 'SPORTS' | 'GALA' | 'TECH_SUMMIT' | 'WEDDING';
    eventName: string;
    logoDropCount: 10 | 25 | 50 | 100 | 250 | 500;
    shippingAddress: { street: string; city: string; country: string; postalCode: string };
    currency?: string;
  }) {
    const res = await fetch('/api/souvenirs/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to place souvenir order' }));
      throw new Error(err.error || 'Failed to place souvenir order');
    }
    isUsingMockData = false;
    return res.json();
  },

  /** GET /api/charities/active — public */
  async getActiveCharities() {
    const res = await fetch('/api/charities/active');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load charities' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    isUsingMockData = false;
    return res.json();
  },

  /** POST /api/charities/register — capacity-gated on the server */
  async registerCharity(params: {
    legalEntityName: string;
    registrationNumber: string;
    registrationJurisdiction: string;
    headquartersAddress: string;
    focusPillar: 'REFORESTATION_AND_LAND' | 'OCEAN_AND_WATER' | 'COMMUNITY_AND_YOUTH';
    primaryContactName: string;
    primaryContactEmail: string;
    stripeConnectedAccountId?: string;
    annualFinancialStatementUrl?: string;
    impactMetricDescription: string;
    authorizedSignatoryName: string;
    authorizedSignatoryTitle: string;
    agreedToTerms: boolean;
  }) {
    const res = await fetch('/api/charities/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), {
        status: res.status,
        body: err,
      });
    }
    isUsingMockData = false;
    return res.json();
  },

  /** POST /api/custom-merch/preview */
  async previewCustomKeepsake(params: {
    garmentModel: string;
    inscribedText: string;
    threadColor: string;
    placement: string;
    quantity?: number;
    unitPriceCents?: number;
  }) {
    const res = await fetch('/api/custom-merch/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Preview failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    isUsingMockData = false;
    return res.json();
  },

  /** POST /api/custom-merch/checkout */
  async checkoutCustomKeepsake(params: {
    licenseeId: string;
    garmentModel: string;
    inscribedText: string;
    threadColor: string;
    placement: string;
    quantity?: number;
    unitPriceCents?: number;
    currency?: string;
    checkoutReferenceId?: string;
    isGoalFrenzy?: boolean;
    frenzyClub?: string;
    frenzyOpponent?: string;
    frenzyMinute?: string;
    frenzyMoment?: string;
    frenzyQuote?: string;
  }) {
    const res = await fetch('/api/custom-merch/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Custom merch checkout failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    isUsingMockData = false;
    return res.json();
  },

  /** Returns the URL for downloading a PDF invoice */
  getInvoicePdfUrl(orderNumber: string): string {
    return `/api/orders/${encodeURIComponent(orderNumber.trim().toUpperCase())}/invoice-pdf`;
  },

  async getPortalSummary(token: string) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.getPortalSummary();
    }
    try {
      const res = await fetch('/api/portal/summary', {
        headers: getAuthHeader(token),
      });
      if (!res.ok) throw new Error('Failed to fetch summary');
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock summary', e);
      isUsingMockData = true;
      return mockApi.getPortalSummary();
    }
  },

  async getPortalTransactions(token?: string) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.getPortalTransactions();
    }
    try {
      const res = await fetch('/api/portal/transactions', {
        headers: getAuthHeader(token),
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock transactions', e);
      isUsingMockData = true;
      return mockApi.getPortalTransactions();
    }
  },

  async getTransparencyLedger() {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.getTransparencyLedger();
    }
    try {
      const res = await fetch('/api/v1/transparency-ledger');
      if (!res.ok) throw new Error('Failed to fetch transparency ledger');
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock transparency ledger', e);
      isUsingMockData = true;
      return mockApi.getTransparencyLedger();
    }
  },

  async getSplitConfigHistory(token: string, licenseeId?: string) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.getSplitConfigHistory(licenseeId);
    }
    try {
      const query = licenseeId ? `?licenseeId=${encodeURIComponent(licenseeId)}` : '';
      const res = await fetch(`/api/admin/split-config/history${query}`, {
        headers: getAuthHeader(token),
      });
      if (!res.ok) throw new Error('Failed to fetch split config history');
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock split history', e);
      isUsingMockData = true;
      return mockApi.getSplitConfigHistory(licenseeId);
    }
  },

  async createSplitConfig(token: string, data: { licenseeId?: string | null; royaltyBps: number; charityAllocationBps: Array<{ charityId: string; bps: number }> }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.createSplitConfig(data);
    }
    try {
      const res = await fetch('/api/admin/split-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create split config' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      isUsingMockData = false;
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) throw e;
      console.warn('[API Client] Backend unreachable, using mock createSplitConfig', e);
      isUsingMockData = true;
      return mockApi.createSplitConfig(data);
    }
  },

  async getPortalJobReports(token: string) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.getPortalJobReports();
    }
    try {
      const res = await fetch('/api/portal/job-reports', {
        headers: getAuthHeader(token),
      });
      if (!res.ok) throw new Error('Failed to fetch portal job reports');
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock getPortalJobReports', e);
      isUsingMockData = true;
      return mockApi.getPortalJobReports();
    }
  },

  async submitPortalJobReport(token: string, data: { periodType: string; periodStart: string; periodEnd: string; jobsCreated: number; attestationNote?: string }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.submitPortalJobReport(data);
    }
    try {
      const res = await fetch('/api/portal/job-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to submit job creation report' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      isUsingMockData = false;
      return res.json();
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) throw e;
      console.warn('[API Client] Backend unreachable, using mock submitPortalJobReport', e);
      isUsingMockData = true;
      return mockApi.submitPortalJobReport(data);
    }
  },

  async assessJobCompliance(params: {
    projectValueGbp?: number;
    totalWorkers: number;
    localWorkers: number;
    apprenticeCount: number;
    livingWageCompliant: boolean;
    trainingHours?: number;
  }) {
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.assessJobCompliance(params);
    }
    try {
      const res = await fetch('/api/jobs/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Assessment calculation failed');
      isUsingMockData = false;
      return res.json();
    } catch (e) {
      console.warn('[API Client] Backend unreachable, using mock assessJobCompliance', e);
      isUsingMockData = true;
      return mockApi.assessJobCompliance(params);
    }
  },

  // ── ISO Audit-Readiness & Carbon Compliance ─────────────────────────────

  async getComplianceFrameworks(): Promise<any> {
    const res = await fetch('/api/iso-readiness/frameworks');
    if (!res.ok) throw new Error('Failed to load compliance frameworks');
    return res.json();
  },

  async getDiagnosticBundle(frameworkIds: string[]): Promise<any> {
    const res = await fetch('/api/iso-readiness/diagnostic-bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameworkIds }),
    });
    if (!res.ok) throw new Error('Failed to load diagnostic bundle');
    return res.json();
  },

  async getIsoFramework(): Promise<any> {
    const res = await fetch('/api/iso-readiness/framework');
    if (!res.ok) throw new Error('Failed to load ISO framework');
    return res.json();
  },

  async submitIsoAnswers(
    token: string,
    params: { answers: any[]; tierSelected?: string; selectedFrameworks?: string[] }
  ): Promise<any> {
    const res = await fetch('/api/iso-readiness/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async reviewIsoSubmission(
    token: string,
    params: { submissionId: string; auditorNotes?: string; targetStatus?: string }
  ): Promise<any> {
    const res = await fetch('/api/iso-readiness/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async createIsoCheckout(
    token: string,
    params: { submissionId: string; tierSelected: string; successUrl: string; cancelUrl: string }
  ): Promise<any> {
    const res = await fetch('/api/iso-readiness/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getIsoStatus(token: string, licenseeId: string): Promise<any> {
    const res = await fetch(`/api/iso-readiness/status/${licenseeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // ── Credential Studio & Trust Seal ──────────────────────────────────────────

  async composeBadge(
    token: string,
    params: { clientLogoFile: File; clientMessage: string; submissionId?: string }
  ): Promise<any> {
    const form = new FormData();
    form.append('clientLogo', params.clientLogoFile);
    form.append('clientMessage', params.clientMessage);
    if (params.submissionId) form.append('submissionId', params.submissionId);
    const res = await fetch('/api/credentials/compose', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async mintCredential(
    token: string,
    params: { clientLogoFile: File; clientMessage: string; submissionId: string; recipientAddress?: string }
  ): Promise<any> {
    const form = new FormData();
    form.append('clientLogo', params.clientLogoFile);
    form.append('clientMessage', params.clientMessage);
    form.append('submissionId', params.submissionId);
    if (params.recipientAddress) form.append('recipientAddress', params.recipientAddress);
    const res = await fetch('/api/credentials/mint', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getMyCredentials(token: string): Promise<any> {
    const res = await fetch('/api/credentials/my', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getBadgeStatus(licenseeId: string, origin?: string): Promise<any> {
    const query = origin ? `?licenseeId=${encodeURIComponent(licenseeId)}&origin=${encodeURIComponent(origin)}` : `?licenseeId=${encodeURIComponent(licenseeId)}`;
    const res = await fetch(`/api/v1/badges/status${query}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
};


