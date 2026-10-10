import type {
  EmissionFactorInput,
  EmissionFactorRecord,
  FleetAsset,
  FleetProject,
  FleetProjectInput,
  FleetProjectMaterial,
  FleetCostRun,
  FleetAssetImportResult,
  FleetAssetInput,
  FleetEstimate,
  FleetFuelType,
  FleetImportBatch,
  FleetImportResult,
  FleetOverview,
  FleetSummary,
  FleetApiKeyRecord,
  FleetApiScope,
  FleetConnectionBranch,
  FleetConnectionOverview,
  FleetSetupRequestInput,
  AdminFleetSetupRequest,
  AdminFleetProvider,
  AdminFleetBinding,
  AdminTrackingAsset,
  MappingTestResult,
} from './fleet.types';
import type { ReviewDecisionPayload, ReviewDossier, ReviewQueueItem, ReviewQueueStage } from './review.types';
import type { AnswerInput, ClientEvidence, ClientFramework, ClientSubmission, PipelineFee, PipelineService } from './pipeline.types';
import type { AdminMerchProduct, MerchProduct } from './merch.types';
import type { MarketIndex, MarketIndexValue } from './market.types';
import type { AnchorBatch, AnchorOverview, VerifyResult } from './anchor.types';
import type { Scope3ChainDetail, Scope3ChainSummary, Scope3Record, Scope3RecordInput } from './scope3.types';

function getAuthHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class FleetApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = 'FleetApiError';
  }
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown; form?: FormData; acceptStatus?: number[] } = {}
): Promise<T> {
  const headers: Record<string, string> = { ...getAuthHeader(options.token) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(options.acceptStatus || []).includes(res.status)) {
    throw new FleetApiError(data.error || `HTTP ${res.status}`, res.status, data.code);
  }
  return data as T;
}

export const api = {
  async checkout(params: { licenseeId: string; grossAmountCents: number; checkoutReferenceId?: string }) {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Checkout request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  /** Scope 3 supply chains (client) */
  async listScope3Chains(token: string): Promise<{ chains: Scope3ChainSummary[] }> {
    return apiRequest('/api/scope3/chains', { token });
  },
  async createScope3Chain(token: string, body: { name: string; category: string; projectId?: string | null }) {
    return apiRequest<{ chain: { id: string } }>('/api/scope3/chains', { token, method: 'POST', body });
  },
  async getScope3Chain(token: string, id: string): Promise<{ chain: Scope3ChainDetail }> {
    return apiRequest(`/api/scope3/chains/${encodeURIComponent(id)}`, { token });
  },
  async addScope3Record(token: string, id: string, body: Scope3RecordInput): Promise<{ record: Scope3Record }> {
    return apiRequest(`/api/scope3/chains/${encodeURIComponent(id)}/records`, { token, method: 'POST', body });
  },
  async inviteScope3Supplier(token: string, id: string, supplierEmail: string): Promise<{ invite: { id: string; supplierEmail: string; expiresAt: string }; emailSent: boolean }> {
    return apiRequest(`/api/scope3/chains/${encodeURIComponent(id)}/invites`, { token, method: 'POST', body: { supplierEmail } });
  },
  async revokeScope3Invite(token: string, id: string, inviteId: string) {
    return apiRequest<Record<string, never>>(`/api/scope3/chains/${encodeURIComponent(id)}/invites/${encodeURIComponent(inviteId)}`, {
      token,
      method: 'DELETE',
      acceptStatus: [204],
    });
  },

  /** Supplier invite link (no account) */
  async getSupplierInvite(inviteToken: string): Promise<{ clientName: string; chainName: string; category: string; supplierEmail: string; expiresAt: string }> {
    return apiRequest(`/api/supply-chain/invite?token=${encodeURIComponent(inviteToken)}`);
  },
  async addSupplierRecord(inviteToken: string, body: Omit<Scope3RecordInput, 'supersedesId'>): Promise<{ record: Scope3Record }> {
    return apiRequest('/api/supply-chain/invite/records', { method: 'POST', body: { token: inviteToken, ...body } });
  },

  /** GET /api/public/verify/:hash - public record verification */
  async verifyRecordHash(hash: string): Promise<VerifyResult> {
    return apiRequest(`/api/public/verify/${encodeURIComponent(hash)}`);
  },

  /** Blockchain anchoring (admin) */
  async getAnchors(token: string): Promise<AnchorOverview> {
    return apiRequest('/api/admin/anchors', { token });
  },
  async runAnchoring(token: string): Promise<{ added: Record<string, number>; batch: AnchorBatch | null }> {
    return apiRequest('/api/admin/anchors/run', { token, method: 'POST' });
  },

  /** Market inputs (admin) */
  async getMarketIndices(token: string): Promise<{ indices: MarketIndex[]; fuelFeedConfigured: boolean }> {
    return apiRequest('/api/admin/market-indices', { token });
  },
  async getMarketIndexValues(token: string, indexId: string): Promise<{ values: MarketIndexValue[] }> {
    return apiRequest(`/api/admin/market-indices/${encodeURIComponent(indexId)}/values`, { token });
  },
  async addMarketIndexValue(token: string, indexId: string, body: { effectiveDate: string; value: string; sourceReference: string }) {
    return apiRequest<{ value: MarketIndexValue }>(`/api/admin/market-indices/${encodeURIComponent(indexId)}/values`, { token, method: 'POST', body });
  },
  async deleteMarketIndexValue(token: string, indexId: string, valueId: string) {
    return apiRequest<Record<string, never>>(
      `/api/admin/market-indices/${encodeURIComponent(indexId)}/values/${encodeURIComponent(valueId)}`,
      { token, method: 'DELETE', acceptStatus: [204] }
    );
  },
  async importFuelPrices(token: string): Promise<{ inserted: number; latestDate: string | null }> {
    return apiRequest('/api/admin/market-indices/import-fuel', { token, method: 'POST' });
  },
  async createMarketIndex(
    token: string,
    body: { code: string; name: string; category: string; unit: string; currency: string; source: string; sourceUrl?: string }
  ) {
    return apiRequest<{ index: MarketIndex }>('/api/admin/market-indices', { token, method: 'POST', body });
  },

  /** GET /api/merch/products - active merch items and their current prices */
  async getMerchProducts(): Promise<{ products: MerchProduct[] }> {
    return apiRequest('/api/merch/products');
  },

  /** GET /api/admin/merch/products - every product, including inactive ones */
  async getAdminMerchProducts(token: string): Promise<{ products: AdminMerchProduct[] }> {
    return apiRequest('/api/admin/merch/products', { token });
  },

  /** PATCH /api/admin/merch/products/:id */
  async updateMerchProduct(
    token: string,
    id: string,
    change: { title?: string; description?: string | null; pricePence?: number | null; active?: boolean; sortOrder?: number }
  ): Promise<{ product: AdminMerchProduct }> {
    return apiRequest(`/api/admin/merch/products/${encodeURIComponent(id)}`, { token, method: 'PATCH', body: change });
  },

  /** Starts Stripe Checkout for a catalogue item. The server sets the price from the merch catalogue. */
  async createCheckoutSession(params: { productId: string; quantity?: number }) {
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

  /** GET /api/admin/logo-drop/prices */
  async getAdminLogoDropPrices(
    token: string
  ): Promise<{ currency: string; licensees: { id: string; name: string; pricePerDropCents: number | null }[] }> {
    return apiRequest('/api/admin/logo-drop/prices', { token });
  },

  /** PATCH /api/admin/logo-drop/prices/:licenseeId */
  async updateLogoDropPrice(token: string, licenseeId: string, pricePerDropPence: number | null) {
    return apiRequest<{ licensee: { id: string; name: string; pricePerDropCents: number | null } }>(
      `/api/admin/logo-drop/prices/${encodeURIComponent(licenseeId)}`,
      { token, method: 'PATCH', body: { pricePerDropPence } }
    );
  },

  /** GET /api/portal/logo-drop/pricing - the signed-in client's price per drop and split */
  async getLogoDropPricing(token: string): Promise<{ pricePerDropPence: number | null; royaltyBps: number; currency: string }> {
    return apiRequest('/api/portal/logo-drop/pricing', { token });
  },

  /** POST /api/portal/logo-drop - priced on the server from the client's own licensee */
  async orderLogoDrops(
    token: string,
    params: { quantity: number; deliveryType: 'PHYSICAL' | 'DIGITAL'; attestationNote?: string }
  ) {
    return apiRequest<{ sessionUrl: string | null; transactionId: string }>(
      '/api/portal/logo-drop',
      { token, method: 'POST', body: params }
    );
  },

  async getSouvenirTracker(orderId?: string) {
    // Public endpoint - strictly real data
    const orderNumber = orderId?.trim().toUpperCase();
    if (!orderNumber) return null;
    const res = await fetch(`/api/orders/track/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      const err = await res.json().catch(() => ({ error: 'Failed to track order' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async register(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyName: string;
    jobTitle?: string;
    primaryRole?: string;
    organisationCountry?: string;
    industrySector?: string;
    websiteUrl?: string;
    companyRegistrationNo?: string;
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Account registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid email or password' }));
      throw new Error(err.error || 'Invalid email or password');
    }
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
  },

  async forgotPassword(email: string) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to request password reset' }));
      throw new Error(err.error || 'Failed to request password reset');
    }
    return res.json();
  },

  async resetPassword(params: { token: string; email: string; password: string }) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reset password' }));
      throw new Error(err.error || 'Failed to reset password');
    }
    return res.json();
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
    return res.json();
  },

  /** GET /api/charities/active - public */
  async getActiveCharities() {
    const res = await fetch('/api/charities/active');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load charities' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  /** POST /api/charities/apply - Step 1 charity onboarding */
  async applyCharity(params: {
    name: string;
    registeredCharityNumber?: string;
    contactEmail: string;
    statement: string;
  }) {
    const res = await fetch('/api/charities/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Application submission failed' }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), {
        status: res.status,
        body: err,
      });
    }
    return res.json();
  },

  /** POST /api/partners/verify-email - confirms the email behind a partner application link */
  async verifyPartnerEmail(token: string): Promise<{ success: boolean; kind: 'CHARITY' | 'DELIVERY' }> {
    const res = await fetch('/api/partners/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({ error: 'Could not confirm the email.' }));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** POST /api/charities/register - capacity-gated on the server */
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
    return res.json();
  },

  /** POST /api/custom-merch/preview */
  async previewCustomKeepsake(params: {
    garmentModel: string;
    inscribedText: string;
    threadColor: string;
    placement: string;
    quantity?: number;
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
    return res.json();
  },

  /** POST /api/custom-merch/checkout */
  async checkoutCustomKeepsake(params: {
    garmentModel: string;
    inscribedText: string;
    threadColor: string;
    placement: string;
    quantity?: number;
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
    return res.json();
  },

  /** Returns the URL for downloading a PDF invoice */
  getInvoicePdfUrl(orderNumber: string): string {
    return `/api/orders/${encodeURIComponent(orderNumber.trim().toUpperCase())}/invoice-pdf`;
  },

  async getPortalSummary(token: string) {
    const res = await fetch('/api/portal/summary', {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch summary' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getPortalTransactions(token?: string) {
    const res = await fetch('/api/portal/transactions', {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch transactions' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getTransparencyLedger() {
    const res = await fetch('/api/v1/transparency-ledger');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch transparency ledger' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getSplitConfigHistory(token: string, licenseeId?: string) {
    const query = licenseeId ? `?licenseeId=${encodeURIComponent(licenseeId)}` : '';
    const res = await fetch(`/api/admin/split-config/history${query}`, {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch split config history' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getSplitLicensees(token: string) {
    const res = await fetch('/api/admin/split-config/licensees', {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch licensees' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async createSplitConfig(token: string, data: { licenseeId?: string | null; royaltyBps: number; charityAllocationBps: Array<{ charityId: string; bps: number }> }) {
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
    return res.json();
  },

  async getPortalJobReports(token: string) {
    const res = await fetch('/api/portal/job-reports', {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch portal job reports' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async submitPortalJobReport(token: string, data: { periodType: string; periodStart: string; periodEnd: string; jobsCreated: number; attestationNote?: string }) {
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
    return res.json();
  },

  async assessJobCompliance(params: {
    projectValueGbp?: number;
    totalWorkers: number;
    localWorkers: number;
    apprenticeCount: number;
    livingWageCompliant: boolean;
    trainingHours?: number;
  }) {
    const res = await fetch('/api/jobs/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Assessment calculation failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // -- ISO Audit-Readiness & Carbon Compliance -----------------------------

  async uploadEvidenceProofFile(
    token: string,
    params: { file: File; licenseeId?: string; questionId?: string; matrixRowId?: string; reportId?: string; category?: string }
  ): Promise<any> {
    const form = new FormData();
    form.append('file', params.file);
    if (params.licenseeId) form.append('licenseeId', params.licenseeId);
    if (params.questionId) form.append('questionId', params.questionId);
    if (params.matrixRowId) form.append('matrixRowId', params.matrixRowId);
    if (params.reportId) form.append('reportId', params.reportId);
    if (params.category) form.append('category', params.category);

    const res = await fetch('/api/portal/iso/evidence/upload-file', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      const errorMsg =
        (typeof data?.error === 'string' && data.error) ||
        (typeof data?.message === 'string' && data.message) ||
        (text && text.length < 150 && !text.startsWith('<') ? text : `Upload failed with HTTP ${res.status}`);
      throw new Error(errorMsg);
    }
    return data;
  },

  /** Downloads a stored evidence file through the authenticated endpoint and saves it locally. */
  async downloadEvidenceFile(token: string, fileUrl: string, fileName: string): Promise<void> {
    const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Download failed with HTTP ${res.status}`);
    }
    const blobUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(blobUrl);
  },

  async getEvidenceDocuments(token: string, licenseeId?: string): Promise<any> {
    const url = licenseeId ? `/api/portal/iso/evidence?licenseeId=${encodeURIComponent(licenseeId)}` : '/api/portal/iso/evidence';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // -- Credential Studio & Trust Seal ------------------------------------------

  async issueCredential(
    token: string,
    params: { clientLogoFile: File; clientMessage: string; submissionId: string }
  ): Promise<any> {
    const form = new FormData();
    form.append('clientLogo', params.clientLogoFile);
    form.append('clientMessage', params.clientMessage);
    form.append('submissionId', params.submissionId);
    const res = await fetch('/api/credentials/issue', {
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

  async updateAllowedOrigins(token: string, allowedOrigins: string[]): Promise<any> {
    const res = await fetch('/api/v1/badges/origins', {
      method: 'POST',
      headers: {
        ...getAuthHeader(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ allowedOrigins }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getDemoBookings(token: string): Promise<any> {
    const res = await fetch('/api/admin/demo-bookings', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async submitMerchEnquiry(params: {
    itemId: string;
    itemTitle: string;
    contactName: string;
    contactEmail: string;
    message?: string;
  }): Promise<any> {
    const res = await fetch('/api/merch/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminMerchEnquiries(token: string, status?: string): Promise<any> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/merch-enquiries${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async updateMerchEnquiry(token: string, id: string, params: { status?: string; adminNotes?: string }): Promise<any> {
    const res = await fetch(`/api/admin/merch-enquiries/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminKeepsakeOrders(token: string): Promise<any> {
    const res = await fetch('/api/admin/keepsake-orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async updateAdminKeepsakeOrder(
    token: string,
    id: string,
    params: { fulfillmentStatus?: string; trackingNumber?: string }
  ): Promise<any> {
    const res = await fetch(`/api/admin/keepsake-orders/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminSouvenirOrders(token: string, params?: { status?: string; search?: string }): Promise<any> {
    const queryParts: string[] = [];
    if (params?.status && params.status !== 'ALL') {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    if (params?.search && params.search.trim()) {
      queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    const query = queryParts.length ? `?${queryParts.join('&')}` : '';
    const res = await fetch(`/api/orders/admin${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async updateAdminSouvenirOrderStatus(
    token: string,
    orderNumber: string,
    params: {
      status: string;
      courierName?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      estimatedDelivery?: string;
    }
  ): Promise<any> {
    const res = await fetch(`/api/orders/admin/${encodeURIComponent(orderNumber)}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminCharities(token: string): Promise<any> {
    const res = await fetch('/api/admin/charities', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async approveAdminCharity(token: string, charityId: string): Promise<any> {
    const res = await fetch(`/api/admin/charities/${encodeURIComponent(charityId)}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async applyFulfillmentPartner(params: {
    companyName: string;
    workEmail: string;
    countryCode: string;
    regionOfOperation: string;
    capabilities: string[];
    monthlyCapacityUnits: string;
    certifications: string[];
    message?: string;
  }): Promise<{ success: boolean; applicationId: string; message: string }> {
    const res = await fetch('/api/partners/fulfillment/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async applyCharityPartner(params: {
    orgName: string;
    workEmail: string;
    countryCode: string;
    registrationNumber?: string;
    orgType: string;
    focusAreas: string[];
    annualReportUrl?: string;
    website?: string;
    message?: string;
  }): Promise<{ success: boolean; applicationId: string; message: string }> {
    const res = await fetch('/api/partners/charity/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminFulfillmentPartners(token: string, status?: string): Promise<any> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/partners/fulfillment${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminCharityPartners(token: string, status?: string): Promise<any> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/partners/charity${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async updateAdminFulfillmentPartner(
    token: string,
    id: string,
    params: { status?: string; reviewNotes?: string }
  ): Promise<any> {
    const res = await fetch(`/api/admin/partners/fulfillment/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async updateAdminCharityPartner(
    token: string,
    id: string,
    params: { status?: string; reviewNotes?: string }
  ): Promise<any> {
    const res = await fetch(`/api/admin/partners/charity/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; token: string; user: any }> {
    const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async resendVerificationEmail(email?: string, token?: string): Promise<{ success: boolean; message: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers,
      body: JSON.stringify(email ? { email } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getOrderSummary(params: { sessionId?: string; txId?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params.sessionId) query.set('session_id', params.sessionId);
    if (params.txId) query.set('tx_id', params.txId);
    const res = await fetch(`/api/checkout/order-summary?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // ── Profile & Onboarding ───────────────────────────────────────────────────
  async updateProfile(token: string, params: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    primaryRole?: string;
    companyName?: string;
    organisationCountry?: string;
    industrySector?: string;
    websiteUrl?: string;
    companyRegistrationNo?: string;
  }): Promise<{ message: string; user: any }> {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // ── Assessment Layer ──────────────────────────────────────────────────────
  async submitAssessment(token: string, params: {
    services: ('GHG' | 'WORKFORCE' | 'FLEET')[];
    organisationCountry: string;
    organisationSize: string;
    annualRevenueBand: string;
    industrySector: string;
    hasPhysicalSites?: boolean;
    hasProductionProcess?: boolean;
    hasFleet?: boolean;
    hasIoTMeters?: boolean;
    isUKPublicContractor?: boolean;
    hasPlanningConsent?: boolean;
    makesPublicGreenClaims?: boolean;
    hasGreenHydrogen?: boolean;
    fleetProfile?: { assetCountBand: string; categories: string[]; cloudConnection: string };
  }): Promise<{ message: string; assessment: any; recommendations: any[]; destination: string }> {
    const res = await fetch('/api/assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** Adds another service for an onboarded client, with that service's answers. */
  async addClientService(
    token: string,
    params: {
      service: 'GHG' | 'WORKFORCE' | 'FLEET';
      [answer: string]: unknown;
    }
  ): Promise<{ message: string; destination: string }> {
    const res = await fetch('/api/assessment/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAssessment(token: string): Promise<{ assessment: any }> {
    const res = await fetch('/api/assessment', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getRecommendations(token: string): Promise<{ recommendations: any[] }> {
    const res = await fetch('/api/assessment/recommendations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async decideRecommendation(
    token: string,
    id: string,
    clientAccepted: boolean,
    deferredReason?: string
  ): Promise<{ message: string; recommendation: any }> {
    const res = await fetch(`/api/assessment/recommendations/${id}/decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clientAccepted, deferredReason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getAdminReadinessTracker(token: string): Promise<{ licensees: any[] }> {
    const res = await fetch('/api/admin/readiness-tracker', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // ── Preparation Checklists ────────────────────────────────────────────────
  async getChecklists(token: string): Promise<{ checklists: any[] }> {
    const res = await fetch('/api/checklists', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async getChecklist(token: string, id: string): Promise<{ checklist: any }> {
    const res = await fetch(`/api/checklists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async updateChecklistItem(
    token: string,
    itemId: string,
    params: { status: string; linkedEvidenceDocId?: string }
  ): Promise<{ message: string; checklist: any }> {
    const res = await fetch(`/api/checklists/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async adminWaiveChecklistItem(
    token: string,
    itemId: string,
    reason: string
  ): Promise<{ message: string; checklist: any }> {
    const res = await fetch(`/api/admin/checklists/items/${itemId}/waive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // ── GHG and Workforce pipelines (workflow engine) ───────────────────────

  async getMyFrameworks(token: string, service: PipelineService): Promise<{ frameworks: ClientFramework[] }> {
    return apiRequest(`/api/workflow/my-frameworks?service=${service}`, { token });
  },

  async getPipelineFees(token: string): Promise<{ fees: Record<PipelineService, PipelineFee> }> {
    return apiRequest('/api/workflow/fees', { token });
  },

  async getClientSubmission(token: string, submissionId: string): Promise<{ submission: ClientSubmission }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/view`, { token });
  },

  async startPipelineDraft(token: string, workflowType: string, frameworkId: string): Promise<{ submission: { id: string } }> {
    return apiRequest('/api/workflow/draft', { method: 'POST', token, body: { workflowType, frameworkId } });
  },

  async savePipelineAnswers(token: string, submissionId: string, answers: AnswerInput[]): Promise<{ success: boolean }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/answers`, {
      method: 'PATCH',
      token,
      body: { answers },
    });
  },

  async uploadPipelineEvidence(token: string, file: File): Promise<{ evidenceDocument: ClientEvidence & { createdAt: string } }> {
    const form = new FormData();
    form.append('file', file);
    return apiRequest('/api/workflow/evidence/upload', { method: 'POST', token, form });
  },

  async submitPipeline(token: string, submissionId: string): Promise<{ success: boolean; missingQuestions?: { questionId: string; text: string; clause: string }[]; error?: string }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/submit`, {
      method: 'POST',
      token,
      acceptStatus: [422],
    });
  },

  async startPipelineCheckout(token: string, submissionId: string): Promise<{ checkoutUrl: string }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/checkout-session`, { method: 'POST', token });
  },

  async issuePipelineCredential(token: string, submissionId: string, logo: File, clientMessage: string): Promise<{ credentialId: string }> {
    const form = new FormData();
    form.append('clientLogo', logo);
    form.append('clientMessage', clientMessage);
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/badge-setup`, { method: 'POST', token, form });
  },

  // ── Lead Auditor review (workflow engine) ───────────────────────────────

  async getReviewQueue(token: string, stage: ReviewQueueStage): Promise<{ submissions: ReviewQueueItem[] }> {
    return apiRequest(`/api/workflow/review-queue?stage=${stage}`, { token });
  },

  async getReviewDossier(token: string, submissionId: string): Promise<{ submission: ReviewDossier }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/review-dossier`, { token });
  },

  async getReviewerProfile(
    token: string
  ): Promise<{ profile: { name: string; lastAccreditation: string | null }; aiProvider: 'gemini' | 'anthropic' | 'openai' | null }> {
    return apiRequest('/api/workflow/reviewer-profile', { token });
  },

  async startReview(token: string, submissionId: string): Promise<{ success: boolean }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/transition`, {
      method: 'POST',
      token,
      body: { targetStatus: 'UNDER_REVIEW', reason: 'Lead Auditor started the review' },
    });
  },

  async rerunAiPrescreen(token: string, submissionId: string): Promise<{ success: boolean }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/ai-screen`, { method: 'POST', token });
  },

  async recordReviewDecision(token: string, submissionId: string, decision: ReviewDecisionPayload): Promise<{ success: boolean }> {
    return apiRequest(`/api/workflow/submissions/${encodeURIComponent(submissionId)}/review`, { method: 'POST', token, body: decision });
  },

  // ── Fleet Emissions ─────────────────────────────────────────────────────

  async getFleetCalculatorFuelTypes(): Promise<{ fuelTypes: FleetFuelType[] }> {
    return apiRequest('/api/fleet/calculator/fuel-types');
  },

  async estimateFleetEmissions(params: { fuelType: FleetFuelType; litres: string }): Promise<FleetEstimate> {
    return apiRequest('/api/fleet/calculator', { method: 'POST', body: params });
  },

  async getFleetOverview(token: string): Promise<FleetOverview> {
    return apiRequest('/api/fleet/overview', { token });
  },

  async listFleetProjects(token: string): Promise<{ projects: FleetProject[]; defaultCurrency: string }> {
    return apiRequest('/api/fleet/projects', { token });
  },
  async createFleetProject(token: string, body: FleetProjectInput): Promise<{ project: FleetProject }> {
    return apiRequest('/api/fleet/projects', { token, method: 'POST', body });
  },
  async updateFleetProject(token: string, id: string, body: Partial<FleetProjectInput> & { status?: 'ACTIVE' | 'CLOSED' }): Promise<{ project: FleetProject }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}`, { token, method: 'PATCH', body });
  },
  async assignFleetProjectAsset(token: string, id: string, body: { assetId: string; fromDate: string; toDate?: string | null }): Promise<{ project: FleetProject }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/assets`, { token, method: 'POST', body });
  },
  async endFleetProjectAssignment(token: string, id: string, assignmentId: string, toDate: string | null): Promise<{ project: FleetProject }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/assets/${encodeURIComponent(assignmentId)}`, {
      token,
      method: 'PATCH',
      body: { toDate },
    });
  },
  async removeFleetProjectAssignment(token: string, id: string, assignmentId: string): Promise<{ project: FleetProject }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/assets/${encodeURIComponent(assignmentId)}`, { token, method: 'DELETE' });
  },

  async listFleetMaterialPrices(token: string): Promise<{ indices: { id: string; name: string; unit: string; currency: string }[] }> {
    return apiRequest('/api/fleet/projects/material-prices', { token });
  },
  async listFleetProjectMaterials(token: string, id: string): Promise<{ materials: FleetProjectMaterial[] }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/materials`, { token });
  },
  async setFleetProjectMaterial(token: string, id: string, body: { indexId: string; quantity: string; budgetUnitPrice: string }): Promise<{ materials: FleetProjectMaterial[] }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/materials`, { token, method: 'PUT', body });
  },
  async removeFleetProjectMaterial(token: string, id: string, materialId: string): Promise<{ materials: FleetProjectMaterial[] }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/materials/${encodeURIComponent(materialId)}`, { token, method: 'DELETE' });
  },
  async listFleetCostRuns(token: string, id: string): Promise<{ runs: FleetCostRun[] }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/costs`, { token });
  },
  async calculateFleetProjectCost(token: string, id: string, body: { from?: string; to?: string }): Promise<{ run: FleetCostRun }> {
    return apiRequest(`/api/fleet/projects/${encodeURIComponent(id)}/costs`, { token, method: 'POST', body });
  },

  async listFleetAssets(token: string): Promise<{ assets: FleetAsset[] }> {
    return apiRequest('/api/fleet/assets', { token });
  },

  async createFleetAsset(token: string, asset: FleetAssetInput): Promise<{ asset: FleetAsset; billingSynced: boolean }> {
    return apiRequest('/api/fleet/assets', { method: 'POST', token, body: asset });
  },

  async updateFleetAsset(
    token: string,
    assetId: string,
    changes: Partial<Pick<FleetAsset, 'name' | 'siteName' | 'make' | 'model' | 'serialNumber' | 'active'>>
  ): Promise<{ asset: FleetAsset; billingSynced: boolean }> {
    return apiRequest(`/api/fleet/assets/${encodeURIComponent(assetId)}`, { method: 'PATCH', token, body: changes });
  },

  async importFleetAssets(token: string, file: File): Promise<FleetAssetImportResult> {
    const form = new FormData();
    form.append('file', file);
    return apiRequest('/api/fleet/assets/import', { method: 'POST', token, form, acceptStatus: [422] });
  },

  async importFleetReadings(token: string, file: File, format: 'readings' | 'fuel-card'): Promise<FleetImportResult> {
    const form = new FormData();
    form.append('format', format);
    form.append('file', file);
    return apiRequest('/api/fleet/readings/import', { method: 'POST', token, form, acceptStatus: [422] });
  },

  async listFleetImports(token: string): Promise<{ batches: FleetImportBatch[] }> {
    return apiRequest('/api/fleet/imports', { token });
  },

  async getFleetSummary(token: string, from: string, to: string): Promise<FleetSummary> {
    return apiRequest(`/api/fleet/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { token });
  },

  async downloadFile(token: string, path: string): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetch(path, { headers: getAuthHeader(token) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }));
      throw new FleetApiError(err.error || `HTTP ${res.status}`, res.status, err.code);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/.exec(disposition);
    return { blob: await res.blob(), fileName: match ? match[1] : 'download' };
  },

  async getFleetPricing(): Promise<{ unitAmount: number; currency: string; interval: string }> {
    return apiRequest('/api/fleet/pricing');
  },

  async startFleetSubscription(token: string): Promise<{ checkoutUrl: string; quantity: number }> {
    return apiRequest('/api/fleet/subscription/checkout', { method: 'POST', token });
  },

  async openFleetBillingPortal(token: string): Promise<{ url: string }> {
    return apiRequest('/api/fleet/subscription/portal', { method: 'POST', token });
  },

  async getFleetConnections(token: string): Promise<FleetConnectionOverview> {
    return apiRequest('/api/fleet/connections', { token });
  },

  async setFleetAssetConnection(token: string, assetIds: string[], branch: Exclude<FleetConnectionBranch, 'UNCONFIRMED'>): Promise<{ updated: number }> {
    return apiRequest('/api/fleet/assets/connection', { method: 'POST', token, body: { assetIds, branch } });
  },

  async requestFleetSetupCall(token: string, input: FleetSetupRequestInput): Promise<{ request: { id: string } }> {
    return apiRequest('/api/fleet/setup-requests', { method: 'POST', token, body: input });
  },

  async listAdminFleetSetupRequests(token: string): Promise<{ requests: AdminFleetSetupRequest[] }> {
    return apiRequest('/api/admin/fleet/setup-requests', { token });
  },

  async updateAdminFleetSetupRequest(
    token: string,
    id: string,
    changes: { status: string; scheduledFor?: string | null; adminNotes?: string | null }
  ): Promise<{ request: AdminFleetSetupRequest }> {
    return apiRequest(`/api/admin/fleet/setup-requests/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: changes });
  },

  async listAdminFleetProviders(token: string): Promise<{ providers: AdminFleetProvider[] }> {
    return apiRequest('/api/admin/fleet/providers', { token });
  },

  async createAdminFleetProvider(token: string, body: Record<string, unknown>): Promise<{ provider: AdminFleetProvider }> {
    return apiRequest('/api/admin/fleet/providers', { method: 'POST', token, body });
  },

  async updateAdminFleetProvider(token: string, id: string, body: Record<string, unknown>): Promise<{ provider: AdminFleetProvider }> {
    return apiRequest(`/api/admin/fleet/providers/${encodeURIComponent(id)}`, { method: 'PATCH', token, body });
  },

  async testAdminFleetMapping(token: string, fieldMapping: unknown, sample: unknown): Promise<{ results: MappingTestResult[] }> {
    return apiRequest('/api/admin/fleet/providers/test-mapping', { method: 'POST', token, body: { fieldMapping, sample } });
  },

  async listAdminFleetBindings(token: string): Promise<{ bindings: AdminFleetBinding[]; trackingDeviceAssets: AdminTrackingAsset[] }> {
    return apiRequest('/api/admin/fleet/device-bindings', { token });
  },

  async createAdminFleetBinding(token: string, body: { providerId: string; assetId: string; externalDeviceId: string }): Promise<{ binding: AdminFleetBinding }> {
    return apiRequest('/api/admin/fleet/device-bindings', { method: 'POST', token, body });
  },

  async deactivateAdminFleetBinding(token: string, id: string): Promise<{ binding: AdminFleetBinding }> {
    return apiRequest(`/api/admin/fleet/device-bindings/${encodeURIComponent(id)}/deactivate`, { method: 'POST', token });
  },

  async listFleetApiKeys(token: string): Promise<{ keys: FleetApiKeyRecord[] }> {
    return apiRequest('/api/fleet/api-keys', { token });
  },

  async createFleetApiKey(token: string, name: string, scopes: FleetApiScope[]): Promise<{ key: FleetApiKeyRecord & { key: string } }> {
    return apiRequest('/api/fleet/api-keys', { method: 'POST', token, body: { name, scopes } });
  },

  async revokeFleetApiKey(token: string, keyId: string): Promise<{ key: FleetApiKeyRecord }> {
    return apiRequest(`/api/fleet/api-keys/${encodeURIComponent(keyId)}/revoke`, { method: 'POST', token });
  },

  async listEmissionFactors(token: string): Promise<{ factors: EmissionFactorRecord[] }> {
    return apiRequest('/api/admin/emission-factors', { token });
  },

  async createEmissionFactor(token: string, factor: EmissionFactorInput): Promise<{ factor: EmissionFactorRecord }> {
    return apiRequest('/api/admin/emission-factors', { method: 'POST', token, body: factor });
  },

  async retireEmissionFactor(token: string, factorId: string): Promise<{ factor: EmissionFactorRecord }> {
    return apiRequest(`/api/admin/emission-factors/${encodeURIComponent(factorId)}/retire`, { method: 'POST', token });
  },
};



