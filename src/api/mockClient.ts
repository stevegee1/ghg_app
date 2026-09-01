export interface MockTransaction {
  id: string;
  licenseeId: string;
  grossAmountCents: number;
  currency: string;
  status: 'SETTLED' | 'PENDING' | 'REFUNDED' | 'REVERSED' | 'FAILED';
  createdAt: string;
  triggerEvent: {
    verificationSource: string;
    attestationNote: string;
    deliveryType: 'DIGITAL' | 'PHYSICAL';
    weatherCondition?: string;
  };
  financialSplit: {
    licensorRoyaltyCents: number;
    charityGiftCents: number;
    charityAllocations: Array<{
      charityId: string;
      charityName: string;
      amountCents: number;
      stripeTransferId?: string | null;
    }>;
  };
}

export interface MockSplitConfig {
  id: string;
  licenseeId: string | null;
  royaltyBps: number;
  charityAllocationBps: Array<{ charityId: string; bps: number }>;
  isActive: boolean;
  changedByUserId: string;
  changedAt: string;
  previousConfigId?: string | null;
}

export interface MockSouvenirOrder {
  orderId: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  itemTitle: string;
  quantity: number;
  grossAmountCents: number;
  status: 'ORDER_PLACED' | 'ARTWORK_APPROVED' | 'LOGO_DROP_PRINTED' | 'SHIPPED' | 'DELIVERED';
  trackingNumber: string;
  createdAt: string;
}

const mockSouvenirOrders: MockSouvenirOrder[] = [
  {
    orderId: 'ord_wedding_9988',
    eventName: 'Sarah & Alex Wedding Celebration',
    eventType: 'Wedding Souvenirs',
    eventDate: '2026-09-15',
    itemTitle: 'Eco Organic Cotton Tote Bags (Logo Drop Overlay)',
    quantity: 150,
    grossAmountCents: 37500,
    status: 'LOGO_DROP_PRINTED',
    trackingNumber: 'GB-DHL-99881122',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    orderId: 'ord_gala_5544',
    eventName: 'Global Hydrogen Annual Summit',
    eventType: 'Corporate Gala Merch',
    eventDate: '2026-10-01',
    itemTitle: 'Custom Printed Ceramic Mugs',
    quantity: 300,
    grossAmountCents: 90000,
    status: 'SHIPPED',
    trackingNumber: 'GB-ROYAL-554499',
    createdAt: '2026-08-05T14:20:00Z',
  },
];

const mockTransactions: MockTransaction[] = [
  {
    id: 'tx_itm_001',
    licenseeId: 'lic_itm_power',
    grossAmountCents: 10000,
    currency: 'GBP',
    status: 'SETTLED',
    createdAt: '2026-07-01T12:00:00Z',
    triggerEvent: {
      verificationSource: 'THIRD_PARTY_API',
      attestationNote: "Data submitted via partner's own API/telemetry system. Not independently audited.",
      deliveryType: 'DIGITAL',
      weatherCondition: 'Sunny 22C',
    },
    financialSplit: {
      licensorRoyaltyCents: 8000,
      charityGiftCents: 2000,
      charityAllocations: [
        { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', amountCents: 1000, stripeTransferId: 'tr_mock_001' },
        { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: 1000, stripeTransferId: 'tr_mock_002' },
      ],
    },
  },
  {
    id: 'tx_itm_002',
    licenseeId: 'lic_itm_power',
    grossAmountCents: 5500,
    currency: 'GBP',
    status: 'PENDING',
    createdAt: '2026-07-10T14:30:00Z',
    triggerEvent: {
      verificationSource: 'MANUAL_ATTESTATION',
      attestationNote: 'Manually attested by an authorized user. Not independently audited.',
      deliveryType: 'DIGITAL',
      weatherCondition: 'Windy 15C',
    },
    financialSplit: {
      licensorRoyaltyCents: 4400,
      charityGiftCents: 1100,
      charityAllocations: [
        { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', amountCents: 550, stripeTransferId: null },
        { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: 550, stripeTransferId: null },
      ],
    },
  },
  {
    id: 'tx_jcb_001',
    licenseeId: 'lic_jcb_test',
    grossAmountCents: 25000,
    currency: 'GBP',
    status: 'SETTLED',
    createdAt: '2026-07-15T10:30:00Z',
    triggerEvent: {
      verificationSource: 'THIRD_PARTY_API',
      attestationNote: "Data submitted via partner's own API/telemetry system. Not independently audited.",
      deliveryType: 'DIGITAL',
    },
    financialSplit: {
      licensorRoyaltyCents: 20000,
      charityGiftCents: 5000,
      charityAllocations: [
        { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: 5000, stripeTransferId: 'tr_mock_003' },
      ],
    },
  },
  {
    id: 'tx_jcb_002',
    licenseeId: 'lic_jcb_test',
    grossAmountCents: 12000,
    currency: 'GBP',
    status: 'REVERSED',
    createdAt: '2026-07-18T09:15:00Z',
    triggerEvent: {
      verificationSource: 'CONSUMER_OPT_IN',
      attestationNote: 'Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.',
      deliveryType: 'DIGITAL',
    },
    financialSplit: {
      licensorRoyaltyCents: 9600,
      charityGiftCents: 2400,
      charityAllocations: [
        { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: 2400, stripeTransferId: 'tr_mock_rev' },
      ],
    },
  },
  {
    id: 'tx_arsenal_001',
    licenseeId: 'lic_arsenal_fc',
    grossAmountCents: 2500,
    currency: 'GBP',
    status: 'SETTLED',
    createdAt: '2026-07-20T16:00:00Z',
    triggerEvent: {
      verificationSource: 'CONSUMER_OPT_IN',
      attestationNote: 'Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.',
      deliveryType: 'DIGITAL',
    },
    financialSplit: {
      licensorRoyaltyCents: 2125,
      charityGiftCents: 375,
      charityAllocations: [
        { charityId: 'charity_youth_sport', charityName: 'Youth Eco Sports Alliance', amountCents: 375, stripeTransferId: 'tr_mock_004' },
      ],
    },
  },
];

const mockSplitHistory: MockSplitConfig[] = [
  {
    id: 'cfg_default_v2',
    licenseeId: null,
    royaltyBps: 8500,
    charityAllocationBps: [
      { charityId: 'charity_green_earth', bps: 5000 },
      { charityId: 'charity_ocean_clean', bps: 5000 },
    ],
    isActive: true,
    changedByUserId: 'usr_admin_001',
    changedAt: '2026-07-01T00:00:00Z',
    previousConfigId: 'cfg_default_v1',
  },
  {
    id: 'cfg_default_v1',
    licenseeId: null,
    royaltyBps: 8000,
    charityAllocationBps: [
      { charityId: 'charity_green_earth', bps: 10000 },
    ],
    isActive: false,
    changedByUserId: 'usr_admin_001',
    changedAt: '2026-06-01T00:00:00Z',
    previousConfigId: null,
  },
];

export const mockApi = {
  async checkout(params: { licenseeId: string; grossAmountCents: number; checkoutReferenceId?: string }) {
    await new Promise((r) => setTimeout(r, 400));
    const licensorRoyaltyCents = Math.round((params.grossAmountCents * 8500) / 10000);
    const charityGiftCents = params.grossAmountCents - licensorRoyaltyCents;
    
    return {
      transactionId: `tx_demo_${Date.now().toString().slice(-6)}`,
      clientSecret: 'pi_demo_secret_mock_123',
      grossAmountCents: params.grossAmountCents,
      licensorRoyaltyCents,
      charityGiftCents,
      charityAllocations: [
        { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', amountCents: Math.floor(charityGiftCents / 2) },
        { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: Math.ceil(charityGiftCents / 2) },
      ],
    };
  },

  async b2bTrigger(params: {
    licenseeId: string;
    quantity: number;
    deliveryType: 'PHYSICAL' | 'DIGITAL';
    externalReferenceId: string;
    attestationNote?: string;
    logoName?: string;
  }) {
    await new Promise((r) => setTimeout(r, 450));
    const pricePerDrop = params.licenseeId === 'lic_jcb_test' ? 750 : 500;
    const grossAmountCents = params.quantity * pricePerDrop;
    const licensorRoyaltyCents = Math.round((grossAmountCents * 8500) / 10000);
    const charityGiftCents = grossAmountCents - licensorRoyaltyCents;

    const newTx: MockTransaction = {
      id: `tx_b2b_${Date.now().toString().slice(-6)}`,
      licenseeId: params.licenseeId,
      grossAmountCents,
      currency: 'GBP',
      status: 'SETTLED',
      createdAt: new Date().toISOString(),
      triggerEvent: {
        verificationSource: 'MANUAL_ATTESTATION',
        attestationNote: params.attestationNote || 'Manually attested by partner. Not independently audited.',
        deliveryType: params.deliveryType,
      },
      financialSplit: {
        licensorRoyaltyCents,
        charityGiftCents,
        charityAllocations: [
          { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', amountCents: Math.floor(charityGiftCents / 2), stripeTransferId: 'tr_b2b_01' },
          { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: Math.ceil(charityGiftCents / 2), stripeTransferId: 'tr_b2b_02' },
        ],
      },
    };

    mockTransactions.unshift(newTx);
    return {
      transactionId: newTx.id,
      grossAmountCents,
      licensorRoyaltyCents,
      charityGiftCents,
      clientSecret: 'pi_b2b_mock_secret_999',
      status: 'SETTLED',
      openSeaUrl: `https://opensea.io/assets/ethereum/0x71c7656ec7ab88b098defb751b7401b5f6d8976f/${newTx.id.slice(-4)}`,
    };
  },

  async createAnnualLicense(params: {
    licenseeId: string;
    partnerName: string;
    annualCarbonTonnes: number;
  }) {
    await new Promise((r) => setTimeout(r, 400));
    // Fee metric: £10 per tonne CO2e/year (minimum £500/year)
    const annualFeeGbp = Math.max(500, params.annualCarbonTonnes * 10);
    const grossAmountCents = annualFeeGbp * 100;
    const royaltyCents = Math.round((grossAmountCents * 8500) / 10000);
    const charityCents = grossAmountCents - royaltyCents;

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const newTx: MockTransaction = {
      id: `lic_year_${Date.now().toString().slice(-6)}`,
      licenseeId: params.licenseeId,
      grossAmountCents,
      currency: 'GBP',
      status: 'SETTLED',
      createdAt: new Date().toISOString(),
      triggerEvent: {
        verificationSource: 'MANUAL_ATTESTATION',
        attestationNote: `Annual Carbon Emissions Assertion: ${params.annualCarbonTonnes} tonnes CO2e/yr. 1-Year Verified Warranty Mark issued until ${expiryDate.toISOString().split('T')[0]}. Not independently audited.`,
        deliveryType: 'DIGITAL',
      },
      financialSplit: {
        licensorRoyaltyCents: royaltyCents,
        charityGiftCents: charityCents,
        charityAllocations: [
          { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', amountCents: Math.floor(charityCents / 2), stripeTransferId: 'tr_annual_01' },
          { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', amountCents: Math.ceil(charityCents / 2), stripeTransferId: 'tr_annual_02' },
        ],
      },
    };

    mockTransactions.unshift(newTx);
    return {
      transactionId: newTx.id,
      annualFeeGbp,
      grossAmountCents,
      royaltyCents,
      charityCents,
      warrantyExpiresAt: expiryDate.toISOString().split('T')[0],
      apiKey: `ghg_live_${params.licenseeId.replace('lic_', '')}_99882233`,
      openSeaUrl: `https://opensea.io/assets/ethereum/0x71c7656ec7ab88b098defb751b7401b5f6d8976f/${newTx.id.slice(-4)}`,
    };
  },

  async createSouvenirOrder(params: {
    eventName: string;
    eventType: string;
    eventDate: string;
    itemTitle: string;
    quantity: number;
    pricePerItemCents: number;
  }) {
    await new Promise((r) => setTimeout(r, 450));
    const grossAmountCents = params.quantity * params.pricePerItemCents;
    const orderId = `ord_${params.eventType.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;

    const newOrder: MockSouvenirOrder = {
      orderId,
      eventName: params.eventName,
      eventType: params.eventType,
      eventDate: params.eventDate,
      itemTitle: params.itemTitle,
      quantity: params.quantity,
      grossAmountCents,
      status: 'ORDER_PLACED',
      trackingNumber: `GB-DHL-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
    };

    mockSouvenirOrders.unshift(newOrder);
    return newOrder;
  },

  async getSouvenirTracker(orderId?: string) {
    await new Promise((r) => setTimeout(r, 300));
    if (!orderId) return mockSouvenirOrders[0];
    const found = mockSouvenirOrders.find((o) => o.orderId.toLowerCase() === orderId.toLowerCase());
    return found || mockSouvenirOrders[0];
  },

  async register(params: { firstName: string; lastName: string; email: string; password: string; companyName: string }) {
    await new Promise((r) => setTimeout(r, 400));
    const licenseeId = `lic_${params.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    return {
      token: `mock_jwt_token_${licenseeId}`,
      user: {
        id: `usr_${Date.now().toString(36)}`,
        email: params.email.toLowerCase(),
        role: 'PARTNER',
        licenseeId,
        firstName: params.firstName,
        lastName: params.lastName,
        companyName: params.companyName,
      },
    };
  },

  async login(email: string, password: string) {
    await new Promise((r) => setTimeout(r, 300));
    if (email === 'admin@ghglogodrop.com' && (password === 'SecurePassword123!' || password === 'AdminPass123!')) {
      return {
        token: 'mock_jwt_token_admin',
        user: { id: 'usr_admin_001', email, role: 'ADMIN', licenseeId: null },
      };
    }
    if (email === 'partner@itm-power.com' && (password === 'SecurePassword123!' || password === 'AdminPass123!')) {
      return {
        token: 'mock_jwt_token_partner_itm',
        user: { id: 'usr_partner_001', email, role: 'PARTNER', licenseeId: 'lic_itm_power' },
      };
    }
    // Accept newly registered mock accounts
    if (email && password && password.length >= 8) {
      return {
        token: `mock_jwt_token_${Date.now().toString(36)}`,
        user: { id: `usr_${Date.now().toString(36)}`, email, role: 'PARTNER', licenseeId: 'lic_enterprise' },
      };
    }
    throw new Error('Invalid email or password');
  },

  async forgotPassword(email: string) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
    };
  },

  async resetPassword(params: { token: string; email: string; password: string }) {
    await new Promise((r) => setTimeout(r, 300));
    if (!params.token || !params.password || params.password.length < 8) {
      throw new Error('Invalid or expired password reset token');
    }
    return {
      message: 'Your password has been successfully reset. You may now sign in with your new credentials.',
    };
  },

  async createEventSouvenirOrder(params: {
    eventName: string;
    eventType: string;
    eventDate: string;
    itemId: string;
    quantity: number;
    shippingAddress: string;
  }) {
    await new Promise((r) => setTimeout(r, 400));
    const txId = `tx_souvenir_${Date.now()}`;
    return {
      success: true,
      orderId: `ord_souvenir_${Date.now().toString(36)}`,
      transactionId: txId,
      eventName: params.eventName,
      quantity: params.quantity,
      shippingAddress: params.shippingAddress,
      status: 'CONFIRMED',
      message: 'Event keepsakes batch registered with 15% statutory ESG charitable split.',
    };
  },

  async getPortalSummary(licenseeId?: string | null) {
    await new Promise((r) => setTimeout(r, 200));
    const txs = licenseeId
      ? mockTransactions.filter((t) => t.licenseeId === licenseeId)
      : mockTransactions;
    const settled = txs.filter((t) => t.status === 'SETTLED');
    return {
      totalSettledTransactions: settled.length,
      totalGrossVolumeCents: settled.reduce((sum, t) => sum + t.grossAmountCents, 0),
      totalCharityGiftCents: settled.reduce((sum, t) => sum + t.financialSplit.charityGiftCents, 0),
    };
  },

  async getPortalTransactions(licenseeId?: string | null) {
    await new Promise((r) => setTimeout(r, 250));
    return {
      transactions: licenseeId
        ? mockTransactions.filter((t) => t.licenseeId === licenseeId)
        : mockTransactions,
    };
  },

  async getTransparencyLedger() {
    await new Promise((r) => setTimeout(r, 300));
    const settled = mockTransactions.filter((t) => t.status === 'SETTLED');
    return {
      totalSettledTransactions: settled.length,
      totalCharityGiftCents: settled.reduce((sum, t) => sum + t.financialSplit.charityGiftCents, 0),
      charityPercentage: 15,
      publicPartners: [
        {
          licenseeId: 'lic_itm_power',
          name: 'ITM Power Test',
          vertical: 'B2B_CLEAN_TECH',
          totalSettledTransactions: 1,
          totalCharityGiftCents: 2000,
          jobsCreated: 340,
          attestationNote: 'Self-reported by partner via portal. Not independently verified.',
        },
        {
          licenseeId: 'lic_jcb_test',
          name: 'JCB Heavy Equipment',
          vertical: 'HEAVY_MANUFACTURING',
          totalSettledTransactions: 1,
          totalCharityGiftCents: 5000,
          jobsCreated: 210,
          attestationNote: 'Submitted via partner\'s own system/API. Not independently verified.',
        },
        {
          licenseeId: 'lic_arsenal_fc',
          name: 'Arsenal FC Merchandise',
          vertical: 'SPORTS_ENTERTAINMENT',
          totalSettledTransactions: 1,
          totalCharityGiftCents: 375,
          jobsCreated: 150,
          attestationNote: 'Self-reported by partner via portal. Not independently verified.',
        },
      ],
    };
  },

  async getSplitConfigHistory(licenseeId?: string | null) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      history: mockSplitHistory.filter((c) => (licenseeId ? c.licenseeId === licenseeId : c.licenseeId === null)),
    };
  },

  async createSplitConfig(data: { licenseeId?: string | null; royaltyBps: number; charityAllocationBps: Array<{ charityId: string; bps: number }> }) {
    await new Promise((r) => setTimeout(r, 400));
    const newCfg: MockSplitConfig = {
      id: `cfg_${Date.now()}`,
      licenseeId: data.licenseeId || null,
      royaltyBps: data.royaltyBps,
      charityAllocationBps: data.charityAllocationBps,
      isActive: true,
      changedByUserId: 'usr_admin_001',
      changedAt: new Date().toISOString(),
      previousConfigId: mockSplitHistory[0]?.id || null,
    };
    mockSplitHistory.forEach((c) => {
      if ((c.licenseeId === (data.licenseeId || null))) {
        c.isActive = false;
      }
    });
    mockSplitHistory.unshift(newCfg);
    return newCfg;
  },

  async getPortalJobReports() {
    await new Promise((r) => setTimeout(r, 200));
    return { data: mockJobReports };
  },

  async submitPortalJobReport(data: { periodType: string; periodStart: string; periodEnd: string; jobsCreated: number; attestationNote?: string }) {
    await new Promise((r) => setTimeout(r, 300));
    const newReport = {
      id: `jrep_${Date.now()}`,
      licenseeId: 'lic_itm_power',
      periodType: data.periodType,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      jobsCreated: data.jobsCreated,
      reportSource: 'MANUAL_ATTESTATION',
      attestationNote: data.attestationNote || 'Self-reported by partner via portal. Not independently verified.',
      submittedByUserId: 'usr_partner_001',
      createdAt: new Date().toISOString(),
    };
    mockJobReports.unshift(newReport);
    return newReport;
  },

  async assessJobCompliance(params: {
    projectValueGbp?: number;
    totalWorkers: number;
    localWorkers: number;
    apprenticeCount: number;
    livingWageCompliant: boolean;
    trainingHours?: number;
  }) {
    await new Promise((r) => setTimeout(r, 200));
    const total = params.totalWorkers || 1;
    const localRatio = (params.localWorkers / total) * 100;
    const apprenticeRatio = (params.apprenticeCount / total) * 100;
    let score = 0;
    const notes: string[] = [];

    if (localRatio >= 25) {
      score += 40;
      notes.push(`Local resident employment (${localRatio.toFixed(1)}%) exceeds 20% Section 106 threshold.`);
    } else if (localRatio >= 15) {
      score += 25;
      notes.push(`Local employment ratio (${localRatio.toFixed(1)}%) requires minor improvement.`);
    } else {
      score += 10;
      notes.push(`Local labor deficit: ${localRatio.toFixed(1)}% is below statutory planning covenant.`);
    }

    if (apprenticeRatio >= 5) {
      score += 30;
      notes.push(`Apprentice density (${apprenticeRatio.toFixed(1)}%) conforms with City & Guilds standard.`);
    } else {
      score += 10;
      notes.push(`Apprentice quota deficit.`);
    }

    if (params.livingWageCompliant) score += 20;
    if ((params.trainingHours || 0) >= 1000) score += 10;

    const grade = score >= 85 ? 'CONFORMANT_GRADE_A' : score >= 65 ? 'ACTION_REQUIRED' : 'CRITICAL_DEFICIT';

    return {
      score,
      grade,
      localLaborRatio: parseFloat(localRatio.toFixed(1)),
      apprenticeRatio: parseFloat(apprenticeRatio.toFixed(1)),
      livingWageCompliant: params.livingWageCompliant,
      provisionalSealHash: '7f9a8b1c4e2d3f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a',
      notes,
      isAuditReady: score >= 80,
    };
  },
};

const mockJobReports: any[] = [];
