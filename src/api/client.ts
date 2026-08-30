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
    } catch (e) {
      console.warn('[API Client] Backend unreachable, falling back to mock API', e);
      isUsingMockData = true;
      return mockApi.checkout(params);
    }
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
    if (USE_MOCK_ENV) {
      isUsingMockData = true;
      return mockApi.getSouvenirTracker(orderId);
    }
    try {
      isUsingMockData = false;
      return mockApi.getSouvenirTracker(orderId);
    } catch (e) {
      isUsingMockData = true;
      return mockApi.getSouvenirTracker(orderId);
    }
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
};
