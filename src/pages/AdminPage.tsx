import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { EmissionFactorsAdmin } from '../components/admin/EmissionFactorsAdmin';
import { CharityReserveAdmin } from '../components/admin/CharityReserveAdmin';
import { NewsletterAdmin } from '../components/admin/NewsletterAdmin';
import { MaintenanceModelAdmin } from '../components/admin/MaintenanceModelAdmin';
import { AdminReadinessTracker } from '../components/admin/AdminReadinessTracker';
import { ReviewQueue } from '../components/admin/review/ReviewQueue';
import { FleetSetupRequestsAdmin } from '../components/admin/FleetSetupRequestsAdmin';
import { FleetProvidersAdmin } from '../components/admin/FleetProvidersAdmin';
import { MerchProductsAdmin } from '../components/admin/MerchProductsAdmin';
import { MarketIndicesAdmin } from '../components/admin/MarketIndicesAdmin';
import { AnchorsAdmin } from '../components/admin/AnchorsAdmin';
import { WeatherWearAdmin } from '../components/admin/WeatherWearAdmin';
import { DeliveryPartnersAdmin } from '../components/admin/DeliveryPartnersAdmin';

// Google SaaS Standard SVG Icons (Zero Emojis)
const SvgClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const SvgCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SvgHistory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SvgPackage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const SvgAward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const SvgShoppingBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const SvgHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SvgAlertCircle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SvgCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SvgCopy = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const SvgClose = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ADMIN_TABS = ['READINESS_TRACKER', 'SUBMISSIONS', 'DEMOS', 'SPLITS', 'MERCH_ENQUIRIES', 'KEEPSAKE_ORDERS', 'MERCH_ORDERS', 'CHARITIES', 'EMISSION_FACTORS', 'FLEET_SETUP', 'FLEET_DEVICES', 'DELIVERY_PARTNERS', 'MERCH_PRICES', 'MARKET_INPUTS', 'ANCHORS', 'WEATHER_WEAR', 'NEWSLETTER', 'MAINTENANCE_MODEL'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

export const AdminPage: React.FC = () => {
  const { token, isAdmin } = useAuth();

  // Active top-level admin tab
  // The open tab lives in the URL (?tab=...), so menu links such as /admin?tab=SUBMISSIONS open it.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as AdminTab | null;
  const activeAdminTab: AdminTab = requestedTab && ADMIN_TABS.includes(requestedTab) ? requestedTab : 'READINESS_TRACKER';
  const setActiveAdminTab = (tab: AdminTab) => setSearchParams({ tab });
  // Bumped by "Refresh all" to remount the open tab so it reloads.
  const [refreshKey, setRefreshKey] = useState(0);

  // Merch Enquiries state
  const [merchEnquiries, setMerchEnquiries] = useState<any[]>([]);
  const [loadingMerch, setLoadingMerch] = useState<boolean>(false);
  const [merchStatusFilter, setMerchStatusFilter] = useState<string>('ALL');
  const [merchSearch, setMerchSearch] = useState<string>('');
  const [copiedMerchEmail, setCopiedMerchEmail] = useState<string | null>(null);
  const [updatingMerchId, setUpdatingMerchId] = useState<string | null>(null);
  const [merchNotesState, setMerchNotesState] = useState<{ [id: string]: string }>({});

  // Demo Inquiries state
  const [demoBookings, setDemoBookings] = useState<any[]>([]);
  const [loadingDemos, setLoadingDemos] = useState<boolean>(true);
  const [demoSearch, setDemoSearch] = useState<string>('');
  const [demoFilterScope, setDemoFilterScope] = useState<string>('ALL');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Split configuration state
  const [history, setHistory] = useState<any[]>([]);
  // Loaded from the active configuration; null until one exists or the administrator enters a value.
  const [royaltyBps, setRoyaltyBps] = useState<number | null>(null);
  const bps = royaltyBps ?? 0;
  const [licenseeId, setLicenseeId] = useState<string>(''); // empty = platform default
  const [availableLicensees, setAvailableLicensees] = useState<Array<{ id: string; name: string; vertical?: string }>>([]);

  // Split charities (populated dynamically from database)
  const [charities, setCharities] = useState<Array<{ charityId: string; charityName: string; bps: number }>>([]);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom Keepsake Orders (fulfillment)
  const [keepsakeOrders, setKeepsakeOrders] = useState<any[]>([]);
  const [loadingKeepsake, setLoadingKeepsake] = useState<boolean>(false);
  const [keepsakeStatusFilter, setKeepsakeStatusFilter] = useState<string>('ALL');
  const [updatingKeepsakeId, setUpdatingKeepsakeId] = useState<string | null>(null);
  const [keepsakeTrackingState, setKeepsakeTrackingState] = useState<{ [id: string]: string }>({});
  const [keepsakeStatusState, setKeepsakeStatusState] = useState<{ [id: string]: string }>({});
  const [keepsakeUpdateError, setKeepsakeUpdateError] = useState<string | null>(null);
  const [souvenirUpdateError, setSouvenirUpdateError] = useState<string | null>(null);

  // Standard Souvenir / Merch Orders
  const [souvenirOrders, setSouvenirOrders] = useState<any[]>([]);
  const [loadingSouvenir, setLoadingSouvenir] = useState<boolean>(false);
  const [souvenirStatusFilter, setSouvenirStatusFilter] = useState<string>('ALL');
  const [souvenirSearch, setSouvenirSearch] = useState<string>('');
  const [updatingSouvenirId, setUpdatingSouvenirId] = useState<string | null>(null);
  const [souvenirUpdateState, setSouvenirUpdateState] = useState<{ [orderNumber: string]: { status: string; courier: string; tracking: string; trackingUrl: string; estimatedDelivery: string } }>({});

  // Charity Applications
  const [charityDashboard, setCharityDashboard] = useState<any | null>(null);
  const [loadingCharities, setLoadingCharities] = useState<boolean>(false);
  const [approvingCharityId, setApprovingCharityId] = useState<string | null>(null);

  // Fetch Demo Bookings
  const loadDemoBookings = async () => {
    if (!token) return;
    setLoadingDemos(true);
    try {
      const res = await api.getDemoBookings(token);
      setDemoBookings(res.bookings || []);
    } catch (err: any) {
      console.error('Failed to load demo inquiries:', err);
    } finally {
      setLoadingDemos(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'DEMOS') {
      loadDemoBookings();
    }
  }, [token, activeAdminTab]);

  // Fetch Licensees for Split Scope Selection
  useEffect(() => {
    if (!token || !isAdmin) return;
    api.getSplitLicensees(token).then((res) => {
      if (res?.licensees && Array.isArray(res.licensees)) {
        setAvailableLicensees(res.licensees);
      }
    }).catch((err) => {
      console.warn('Failed to load dynamic licensees list:', err);
    });
  }, [token, isAdmin]);

  // Fetch Split History & Active Charities
  useEffect(() => {
    let isMounted = true;
    async function loadSplitsData() {
      if (!token) return;
      setLoadingHistory(true);
      try {
        const [res, charitiesRes] = await Promise.all([
          api.getSplitConfigHistory(token, licenseeId || undefined),
          api.getActiveCharities(),
        ]);
        const list = Array.isArray(res) ? res : (res?.history || []);
        if (isMounted) {
          setHistory(list);
          const activeCfg = list.find((c: any) => c.isActive) || list[0];
          if (activeCfg) setRoyaltyBps(typeof activeCfg.royaltyBps === 'number' ? activeCfg.royaltyBps : null);
          if (activeCfg && Array.isArray(activeCfg.charityAllocationBps) && activeCfg.charityAllocationBps.length > 0) {
            setCharities(
              activeCfg.charityAllocationBps.map((c: any) => ({
                charityId: c.charityId,
                charityName: c.charityName || c.charityId,
                bps: c.bps,
              }))
            );
          } else if (Array.isArray(charitiesRes?.charities) && charitiesRes.charities.length > 0) {
            const activeList = charitiesRes.charities;
            const count = activeList.length;
            const baseBps = Math.floor(10000 / count);
            const remainder = 10000 % count;
            setCharities(
              activeList.map((c: any, i: number) => ({
                charityId: c.id,
                charityName: c.name,
                bps: baseBps + (i === 0 ? remainder : 0),
              }))
            );
          }
        }
      } catch (err: any) {
        if (isMounted) setError('Failed to load split configuration history');
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    if (activeAdminTab === 'SPLITS') {
      loadSplitsData();
    }
    return () => { isMounted = false; };
  }, [token, licenseeId, activeAdminTab]);

  const charityBpsSum = charities.reduce((sum, c) => sum + c.bps, 0);
  // With no charities the charity share is held and assigned later from the held charity share panel.
  const charitySplitValid = charities.length === 0 || charityBpsSum === 10000;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (royaltyBps === null || royaltyBps < 0 || royaltyBps > 10000) {
      setError('Enter the licensor royalty in basis points (0 to 10000).');
      return;
    }
    if (!charitySplitValid) {
      setError(`Charity allocation basis points must sum to exactly 10000 (100.0%). Current sum: ${charityBpsSum} bps.`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!token || royaltyBps === null) return;
    setSubmitting(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      await api.createSplitConfig(token, {
        licenseeId: licenseeId.trim() || null,
        royaltyBps,
        charityAllocationBps: charities.map((c) => ({ charityId: c.charityId, bps: c.bps })),
      });
      setSuccessMsg('New versioned split configuration successfully created and activated.');

      // Refresh history
      const res = await api.getSplitConfigHistory(token, licenseeId || undefined);
      setHistory(Array.isArray(res) ? res : (res.history || []));
    } catch (err: any) {
      setError(err.message || 'Failed to submit split configuration');
    } finally {
      setSubmitting(false);
    }
  };

  // Export demo bookings to CSV
  const handleExportCsv = () => {
    if (demoBookings.length === 0) return;

    const headers = ['ID', 'Full Name', 'Work Email', 'Company Name', 'Facilities', 'Scope', 'Requested Slot', 'NDA Requested', 'Status', 'Submitted At'];
    const rows = demoBookings.map((b) => [
      b.id,
      `"${(b.fullName || '').replace(/"/g, '""')}"`,
      b.workEmail,
      `"${(b.companyName || '').replace(/"/g, '""')}"`,
      `"${(b.facilityCount || '').replace(/"/g, '""')}"`,
      b.primaryScope,
      new Date(b.requestedSlot).toISOString(),
      b.ndaRequested ? 'YES' : 'NO',
      b.status,
      new Date(b.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ghg_demo_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLeadEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filter demo bookings
  const filteredBookings = demoBookings.filter((b) => {
    const matchesSearch =
      demoSearch === '' ||
      b.fullName?.toLowerCase().includes(demoSearch.toLowerCase()) ||
      b.workEmail?.toLowerCase().includes(demoSearch.toLowerCase()) ||
      b.companyName?.toLowerCase().includes(demoSearch.toLowerCase());
    const matchesScope = demoFilterScope === 'ALL' || b.primaryScope === demoFilterScope;
    return matchesSearch && matchesScope;
  });

  // Fetch Merch Enquiries
  const loadMerchEnquiries = async () => {
    if (!token) return;
    setLoadingMerch(true);
    try {
      const res = await api.getAdminMerchEnquiries(token, merchStatusFilter);
      setMerchEnquiries(res.enquiries || []);
      const initialNotes: { [id: string]: string } = {};
      (res.enquiries || []).forEach((e: any) => {
        initialNotes[e.id] = e.adminNotes || '';
      });
      setMerchNotesState(initialNotes);
    } catch (err: any) {
      console.error('Failed to load merch enquiries:', err);
    } finally {
      setLoadingMerch(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'MERCH_ENQUIRIES') {
      loadMerchEnquiries();
    }
  }, [token, activeAdminTab, merchStatusFilter]);

  // Initial load of counts for badge
  useEffect(() => {
    if (token && isAdmin) {
      api.getAdminMerchEnquiries(token).then((res) => {
        if (res?.enquiries) {
          setMerchEnquiries(res.enquiries);
        }
      }).catch(() => setError('Failed to load merch enquiries.'));
    }
  }, [token, isAdmin]);

  // Fetch Custom Keepsake Orders
  const loadKeepsakeOrders = async () => {
    if (!token) return;
    setLoadingKeepsake(true);
    try {
      const res = await api.getAdminKeepsakeOrders(token);
      const orders: any[] = res.orders || [];
      setKeepsakeOrders(orders);
      const initTracking: { [id: string]: string } = {};
      const initStatus: { [id: string]: string } = {};
      orders.forEach((o: any) => {
        initTracking[o.id] = o.trackingNumber || '';
        initStatus[o.id] = o.fulfillmentStatus || 'PENDING';
      });
      setKeepsakeTrackingState(initTracking);
      setKeepsakeStatusState(initStatus);
    } catch (err: any) {
      console.error('Failed to load keepsake orders:', err);
    } finally {
      setLoadingKeepsake(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'KEEPSAKE_ORDERS') {
      loadKeepsakeOrders();
    }
  }, [token, activeAdminTab, keepsakeStatusFilter]);

  const handleUpdateKeepsakeOrder = async (id: string) => {
    if (!token) return;
    setUpdatingKeepsakeId(id);
    setKeepsakeUpdateError(null);
    try {
      await api.updateAdminKeepsakeOrder(token, id, {
        fulfillmentStatus: keepsakeStatusState[id],
        trackingNumber: keepsakeTrackingState[id] || undefined,
      });
      await loadKeepsakeOrders();
    } catch (err: any) {
      setKeepsakeUpdateError(err.message || 'Failed to update keepsake order');
    } finally {
      setUpdatingKeepsakeId(null);
    }
  };

  const filteredKeepsakeOrders = keepsakeOrders.filter((o) =>
    keepsakeStatusFilter === 'ALL' || o.fulfillmentStatus === keepsakeStatusFilter
  );

  // Fetch Standard Souvenir / Merch Orders
  const loadSouvenirOrders = async () => {
    if (!token) return;
    setLoadingSouvenir(true);
    try {
      const res = await api.getAdminSouvenirOrders(token, {
        status: souvenirStatusFilter !== 'ALL' ? souvenirStatusFilter : undefined,
        search: souvenirSearch.trim() || undefined,
      });
      const orders: any[] = res.orders || [];
      setSouvenirOrders(orders);
      const initState: typeof souvenirUpdateState = {};
      orders.forEach((o: any) => {
        initState[o.orderNumber] = {
          status: o.status,
          courier: o.courierName || '',
          tracking: o.trackingNumber || '',
          trackingUrl: o.trackingUrl || '',
          estimatedDelivery: o.estimatedDelivery ? new Date(o.estimatedDelivery).toISOString().slice(0, 10) : '',
        };
      });
      setSouvenirUpdateState(initState);
    } catch (err: any) {
      console.error('Failed to load souvenir orders:', err);
    } finally {
      setLoadingSouvenir(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'MERCH_ORDERS') {
      loadSouvenirOrders();
    }
  }, [token, activeAdminTab, souvenirStatusFilter]);

  const handleUpdateSouvenirOrder = async (orderNumber: string) => {
    if (!token) return;
    setUpdatingSouvenirId(orderNumber);
    setSouvenirUpdateError(null);
    const s = souvenirUpdateState[orderNumber];
    if (!s) return;
    try {
      await api.updateAdminSouvenirOrderStatus(token, orderNumber, {
        status: s.status,
        courierName: s.courier || undefined,
        trackingNumber: s.tracking || undefined,
        trackingUrl: s.trackingUrl || undefined,
        estimatedDelivery: s.estimatedDelivery || undefined,
      });
      await loadSouvenirOrders();
    } catch (err: any) {
      setSouvenirUpdateError(err.message || 'Failed to update order status');
    } finally {
      setUpdatingSouvenirId(null);
    }
  };

  // Fetch Charity Dashboard
  const loadCharityDashboard = async () => {
    if (!token) return;
    setLoadingCharities(true);
    try {
      const res = await api.getAdminCharities(token);
      setCharityDashboard(res);
    } catch (err: any) {
      console.error('Failed to load charity dashboard:', err);
    } finally {
      setLoadingCharities(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'CHARITIES') {
      loadCharityDashboard();
    }
  }, [token, activeAdminTab]);

  const handleApproveCharity = async (charityId: string) => {
    if (!token) return;
    setApprovingCharityId(charityId);
    try {
      await api.approveAdminCharity(token, charityId);
      await loadCharityDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to approve charity application');
    } finally {
      setApprovingCharityId(null);
    }
  };

  // Preload counts across all administrative streams on initial authenticated mount
  useEffect(() => {
    if (!token) return;
    loadDemoBookings();
    loadMerchEnquiries();
    loadSouvenirOrders();
    loadKeepsakeOrders();
    loadCharityDashboard();
  }, [token]);

  const copyMerchEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedMerchEmail(email);
    setTimeout(() => setCopiedMerchEmail(null), 2000);
  };

  const exportMerchCsv = () => {
    const headers = ['Date', 'Item Title', 'Item ID', 'Customer Name', 'Customer Email', 'Message', 'Status', 'Admin Notes'];
    const rows = filteredMerchEnquiries.map((e) => [
      `"${new Date(e.createdAt).toISOString()}"`,
      `"${(e.itemTitle || '').replace(/"/g, '""')}"`,
      `"${(e.itemId || '').replace(/"/g, '""')}"`,
      `"${(e.contactName || '').replace(/"/g, '""')}"`,
      `"${(e.contactEmail || '').replace(/"/g, '""')}"`,
      `"${(e.message || '').replace(/"/g, '""')}"`,
      `"${e.status}"`,
      `"${(e.adminNotes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ghg_merch_enquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateMerchStatus = async (id: string, newStatus: string) => {
    if (!token) return;
    setUpdatingMerchId(id);
    try {
      await api.updateMerchEnquiry(token, id, {
        status: newStatus,
        adminNotes: merchNotesState[id] !== undefined ? merchNotesState[id] : undefined,
      });
      await loadMerchEnquiries();
    } catch (err: any) {
      alert(err.message || 'Failed to update enquiry status');
    } finally {
      setUpdatingMerchId(null);
    }
  };

  const handleSaveMerchNotes = async (id: string) => {
    if (!token) return;
    setUpdatingMerchId(id);
    try {
      await api.updateMerchEnquiry(token, id, {
        adminNotes: merchNotesState[id] || '',
      });
      await loadMerchEnquiries();
    } catch (err: any) {
      alert(err.message || 'Failed to save admin notes');
    } finally {
      setUpdatingMerchId(null);
    }
  };

  // Filter merch enquiries
  const filteredMerchEnquiries = merchEnquiries.filter((e) => {
    const matchesSearch =
      merchSearch === '' ||
      e.itemTitle?.toLowerCase().includes(merchSearch.toLowerCase()) ||
      e.contactName?.toLowerCase().includes(merchSearch.toLowerCase()) ||
      e.contactEmail?.toLowerCase().includes(merchSearch.toLowerCase()) ||
      e.message?.toLowerCase().includes(merchSearch.toLowerCase());
    const matchesStatus = merchStatusFilter === 'ALL' || e.status === merchStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAdmin) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <h2 className="card-title" style={{ color: 'var(--status-failed-text)' }}>Access Denied</h2>
        <p className="card-subtitle" style={{ margin: '1rem 0' }}>
          Your user account does not have <strong>ADMIN</strong> privileges. Administration is restricted to system administrators.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light, #e2e8f0)', paddingBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1a73e8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              Administration Console
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Executive Administration Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #475569)', marginTop: '0.25rem', maxWidth: '750px' }}>
            Centralised multi-stream administration: ISO remote audit verification, enterprise leads, merchandise fulfilment, statutory charity quota lifecycle, and dynamic financial split routing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setRefreshKey((k) => k + 1);
              loadDemoBookings();
              loadMerchEnquiries();
              loadSouvenirOrders();
              loadKeepsakeOrders();
              loadCharityDashboard();
              if (activeAdminTab === 'SPLITS') {
                api.getSplitConfigHistory(token!, licenseeId || undefined).then((res) => {
                  setHistory(Array.isArray(res) ? res : (res.history || []));
                }).catch(() => setError('Failed to refresh split configuration history.'));
              }
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '6px' }}
          >
            <span>↻</span>
            <span>Refresh all</span>
          </button>
        </div>
      </div>

      {/* Google Cloud Style Segmented Tab Navigation */}
      <div className="admin-tab-nav-wrap" style={{ marginBottom: '1.75rem' }}>
        <div
          role="tablist"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            backgroundColor: 'var(--bg-subtle, #f1f5f9)',
            padding: '5px',
            borderRadius: '10px',
            border: '1px solid var(--border-light, #e2e8f0)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          {([
            { key: 'READINESS_TRACKER', label: 'Readiness Tracker', badge: null },
            { key: 'SUBMISSIONS', label: 'Review Queue', badge: null },
            { key: 'DEMOS', label: 'Demo Leads', badge: demoBookings.length },
            { key: 'MERCH_ENQUIRIES', label: 'Merch Enquiries', badge: merchEnquiries.filter((e) => e.status === 'PENDING').length },
            { key: 'MERCH_PRICES', label: 'Merch Prices', badge: null },
            { key: 'MERCH_ORDERS', label: 'Merch Orders', badge: souvenirOrders.length },
            { key: 'KEEPSAKE_ORDERS', label: 'Keepsake Fulfil', badge: keepsakeOrders.length },
            { key: 'CHARITIES', label: 'Charities', badge: charityDashboard?.committedCount ?? (charityDashboard?.slots ? charityDashboard.slots.filter((s: any) => s.status === 'ACTIVE').length : 0) },
            { key: 'EMISSION_FACTORS', label: 'Emission Factors', badge: null },
            { key: 'FLEET_SETUP', label: 'Fleet Set-up Calls', badge: null },
            { key: 'FLEET_DEVICES', label: 'Fleet Devices', badge: null },
            { key: 'MARKET_INPUTS', label: 'Market Inputs', badge: null },
            { key: 'ANCHORS', label: 'Blockchain Anchors', badge: null },
            { key: 'WEATHER_WEAR', label: 'Weather & Wear', badge: null },
            { key: 'MAINTENANCE_MODEL', label: 'Predictive Maintenance', badge: null },
            { key: 'DELIVERY_PARTNERS', label: 'Delivery Partners', badge: null },
            { key: 'NEWSLETTER', label: 'Newsletter', badge: null },
            { key: 'SPLITS', label: 'Royalty Splits', badge: null },
          ] as const).map(({ key, label, badge }) => {
            const isActive = activeAdminTab === key;
            return (
              <button
                key={key}
                type="button"
                id={`admin-tab-${key.toLowerCase()}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveAdminTab(key)}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '7px',
                  border: isActive ? '1px solid #1a73e8' : '1px solid transparent',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: isActive ? '#1a73e8' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted, #475569)',
                  boxShadow: isActive ? '0 1px 3px rgba(26, 115, 232, 0.28)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{label}</span>
                {badge !== null && (
                  <span
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.06)',
                      color: isActive ? '#ffffff' : 'var(--text-muted, #475569)',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content remounts on "Refresh all", so every tab reloads its own data. */}
      <React.Fragment key={refreshKey}>
      {/* TAB: READINESS TRACKER (CLIENT ONBOARDING & PREPARATION MIRROR) */}
      {activeAdminTab === 'READINESS_TRACKER' && (
        <div style={{ marginBottom: '2.5rem' }}>
          <AdminReadinessTracker />
        </div>
      )}

      {/* TAB: AUDIT REVIEW QUEUE (LEAD AUDITOR CONSOLE) */}
      {activeAdminTab === 'SUBMISSIONS' && token && <ReviewQueue token={token} />}

      {activeAdminTab === 'DEMOS' && (
        <div>
          {/* Tab Context Header */}
          <div className="admin-tab-section-header">
            <div>
              <h2 className="admin-tab-section-title">Enterprise Demo Leads</h2>
              <p className="admin-tab-section-desc">
                Inbound sales leads from the Book Demo flow. Search, filter by statutory scope, email leads directly, and export to CSV for CRM pipeline.
              </p>
            </div>
            <div className="admin-stat-row">
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#0284c7' }} />
                {demoBookings.length} Total Leads
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#10b981' }} />
                {demoBookings.filter((b) => b.status === 'CONFIRMED').length} Confirmed
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#f59e0b' }} />
                {demoBookings.filter((b) => b.ndaRequested).length} NDA Requested
              </span>
            </div>
          </div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
              <input
                type="text"
                placeholder="Search by lead name, company, or email..."
                value={demoSearch}
                onChange={(e) => setDemoSearch(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '220px' }}
              />

              <select
                value={demoFilterScope}
                onChange={(e) => setDemoFilterScope(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="ALL">All Statutory Scopes</option>
                <option value="CARBON_EMISSION">Carbon & Energy (ISO)</option>
                <option value="JOB_REPORTING">Section 106 Workforce</option>
                <option value="DUAL_SCOPE">Dual-Scope</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={loadDemoBookings}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                title="Refresh inquiries list"
              >
                ↻ Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={demoBookings.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Export to CSV</span>
                <span>↓</span>
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingDemos ? (
              <div className="admin-loading-state">
                <span className="admin-spinner" />
                Loading enterprise demo bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="admin-empty-state" style={{ margin: '1.5rem' }}>
                <div className="admin-empty-state-icon">
                  <SvgCalendar />
                </div>
                <div className="admin-empty-state-title">{demoBookings.length === 0 ? 'No Inquiries Yet' : 'No Results'}</div>
                <div className="admin-empty-state-desc">
                  {demoBookings.length === 0
                    ? 'Bookings submitted via the Book Demo flow will appear here instantly.'
                    : 'No bookings matching your search and filter criteria.'}
                </div>
              </div>
            ) : (
              <div className="table-container" style={{ margin: 0 }}>
                <table className="ledger-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Requested Session</th>
                      <th>Lead Contact & Title</th>
                      <th>Organization & Facilities</th>
                      <th>Work Email</th>
                      <th>Statutory Scope</th>
                      <th>NDA</th>
                      <th style={{ textAlign: 'right' }}>Direct Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const slotDate = new Date(b.requestedSlot);
                      const formattedDate = slotDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={b.id}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: b.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                color: b.status === 'CONFIRMED' ? '#10b981' : 'var(--text-muted)',
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: b.status === 'CONFIRMED' ? '#10b981' : '#888' }} />
                              {b.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            {formattedDate} UTC
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Submitted {new Date(b.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.companyName}</div>
                            {b.facilityCount && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.facilityCount}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <a
                                href={`mailto:${b.workEmail}?subject=NFTYLOGS%20Statutory%20Assurance%20Demonstration`}
                                style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 600 }}
                              >
                                {b.workEmail}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyLeadEmail(b.workEmail)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: copiedEmail === b.workEmail ? 'var(--color-green, #10b981)' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  padding: '2px 4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title="Copy email address"
                              >
                                {copiedEmail === b.workEmail ? <SvgCheck size={12} /> : <SvgCopy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>
                              {b.primaryScope === 'CARBON_EMISSION' ? 'Carbon (ISO)' : b.primaryScope === 'JOB_REPORTING' ? 'Section 106' : b.primaryScope}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: b.ndaRequested ? '#4ade80' : 'var(--text-muted)' }}>
                              {b.ndaRequested ? 'Requested' : 'Standard'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <a
                              href={`mailto:${b.workEmail}?subject=NFTYLOGS%20Statutory%20Assurance%20Session&body=Hi%20${encodeURIComponent(b.fullName)},%0A%0AThank%20you%20for%20scheduling%20an%20architectural%20walkthrough%20for%20${encodeURIComponent(b.companyName)}.%0A%0AWe%20look%20forward%20to%20meeting%20you.`}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Email Lead</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SPLIT CONFIGURATION */}
      {activeAdminTab === 'SPLITS' && (
        <div>
          {/* Tab Context Header */}
          <div className="admin-tab-section-header">
            <div>
              <h2 className="admin-tab-section-title">Financial Split Configuration</h2>
              <p className="admin-tab-section-desc">
                Configure versioned royalty and charity disbursement routing rules. Changes apply to future transactions only. All history is immutably ledgered.
              </p>
            </div>
            <div className="admin-stat-row">
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#10b981' }} />
                {history.filter((c: any) => c.isActive).length} Active Config
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#94a3b8' }} />
                {history.length} Total Versions
              </span>
            </div>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>{successMsg}</div>}
          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Form Column */}
            <div className="card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-light, #e2e8f0)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="card-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light, #e2e8f0)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a73e8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Financial Routing Rules
                  </span>
                </div>
                <h2 className="card-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Configure New Active Split
                </h2>
                <p className="card-subtitle" style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #475569)', marginTop: '0.25rem' }}>
                  Changes statutory financial routing rules for future transactions only. Past settlements remain immutably ledgered.
                </p>
              </div>

              <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="licenseeScope" style={{ display: 'block', fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    Target Licensee Scope
                  </label>
                  <select
                    id="licenseeScope"
                    value={licenseeId}
                    onChange={(e) => setLicenseeId(e.target.value)}
                    className="form-select"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium, #cbd5e1)',
                      fontSize: '0.875rem',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="">Platform Default (licenseeId IS NULL) - Platform-Wide Rule</option>
                    {availableLicensees.map((lic) => (
                      <option key={lic.id} value={lic.id}>
                        {lic.name} ({lic.id}) {lic.vertical ? `· ${lic.vertical.replace(/_/g, ' ')}` : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Select whether this split applies platform-wide or overrides financial routing for a specific licensee.
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" htmlFor="royaltyBps" style={{ margin: 0, fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                      Licensor Royalty Basis Points (bps)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      100 bps = 1.0%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="50"
                      value={bps}
                      onChange={(e) => setRoyaltyBps(parseInt(e.target.value, 10) || 0)}
                      style={{ flex: 1, accentColor: '#1a73e8', cursor: 'pointer', height: '6px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        id="royaltyBps"
                        type="number"
                        min="0"
                        max="10000"
                        step="50"
                        value={royaltyBps ?? ''}
                        placeholder="Not set"
                        onChange={(e) => setRoyaltyBps(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                        className="form-input"
                        style={{ width: '90px', fontWeight: 700, textAlign: 'right', padding: '0.45rem 0.6rem', borderRadius: '6px' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>bps</span>
                    </div>
                  </div>

                  {/* Dual metric cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Licensor Royalty
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>
                        {royaltyBps === null ? 'Not set' : `${(bps / 100).toFixed(1)}%`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '2px' }}>
                        {royaltyBps === null ? 'Enter the royalty above' : `£${(bps / 100).toFixed(2)} per £100 gross`}
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Statutory Charity Pool
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                        {royaltyBps === null ? 'Not set' : `${((10000 - bps) / 100).toFixed(1)}%`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>
                        {royaltyBps === null ? 'Enter the royalty above' : `£${((10000 - bps) / 100).toFixed(2)} per £100 gross`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Split Visualization */}
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                    Split Ratio Live Preview (£100.00 Reference Settlement)
                  </div>
                  <FinancialSplitBar
                    grossAmountCents={10000}
                    licensorRoyaltyCents={Math.round((10000 * bps) / 10000)}
                    charityGiftCents={10000 - Math.round((10000 * bps) / 10000)}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                      Approved Charity Beneficiary Allocations
                    </label>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        backgroundColor: charitySplitValid ? '#ecfdf5' : '#fef2f2',
                        color: charitySplitValid ? '#059669' : '#dc2626',
                        border: `1px solid ${charitySplitValid ? '#a7f3d0' : '#fecaca'}`,
                      }}
                    >
                      {charities.length === 0 ? 'No charities: share held' : charitySplitValid ? 'Valid: 10,000 / 10,000 bps (100%)' : `Invalid: ${charityBpsSum} / 10,000 bps`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {charities.length === 0 ? (
                      <div
                        style={{
                          padding: '1.25rem',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '0.875rem',
                          backgroundColor: 'var(--bg-subtle, #f8fafc)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light, #e2e8f0)',
                        }}
                      >
                        No active charities. The charity share will be held and can be assigned below once a charity is active.
                      </div>
                    ) : (
                      charities.map((ch, idx) => (
                        <div
                          key={ch.charityId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg-subtle, #f8fafc)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light, #e2e8f0)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {ch.charityName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ID: <code>{ch.charityId}</code>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              max="10000"
                              step="100"
                              value={ch.bps}
                              onChange={(e) => {
                                const newBps = parseInt(e.target.value, 10) || 0;
                                const updated = [...charities];
                                updated[idx].bps = newBps;
                                setCharities(updated);
                              }}
                              className="form-input"
                              style={{ width: '85px', textAlign: 'right', fontWeight: 700, padding: '0.4rem 0.55rem', borderRadius: '6px' }}
                            />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>bps</span>
                            <span
                              style={{
                                minWidth: '55px',
                                textAlign: 'right',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: '#059669',
                                backgroundColor: '#ecfdf5',
                                padding: '3px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              {(ch.bps / 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!charitySplitValid}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    backgroundColor: charitySplitValid ? '#1a73e8' : '#94a3b8',
                    borderColor: charitySplitValid ? '#1a73e8' : '#94a3b8',
                    cursor: charitySplitValid ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: charitySplitValid ? '0 1px 3px rgba(26, 115, 232, 0.3)' : 'none',
                  }}
                >
                  <span>Review &amp; Activate Configuration</span>
                  <span>→</span>
                </button>
              </form>
            </div>

            {/* Audit History Column */}
            <div className="card" style={{ backgroundColor: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-light, #e2e8f0)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="card-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light, #e2e8f0)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Statutory Audit Trail
                  </span>
                </div>
                <h2 className="card-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Split Configuration Audit History
                </h2>
                <p className="card-subtitle" style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #475569)', marginTop: '0.25rem' }}>
                  Insert-only cryptographic chain of active and deactivated configurations for scope: <code>{licenseeId || 'PLATFORM DEFAULT'}</code>
                </p>
              </div>

              {loadingHistory ? (
                <div className="admin-loading-state">
                  <span className="admin-spinner" />
                  Loading statutory audit history...
                </div>
              ) : history.length === 0 ? (
                <div className="admin-empty-state" style={{ margin: '1rem' }}>
                  <div className="admin-empty-state-icon">
                    <SvgHistory />
                  </div>
                  <div className="admin-empty-state-title">No Audit History</div>
                  <div className="admin-empty-state-desc">
                    No prior split configurations found for scope <strong>{licenseeId || 'PLATFORM DEFAULT'}</strong>.
                  </div>
                </div>
              ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="ledger-table" style={{ fontSize: '0.8125rem', width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Royalty / Charity</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Changed At</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Changed By</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Prev Config ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((cfg) => (
                        <tr key={cfg.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: cfg.isActive ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            {cfg.isActive ? (
                              <span className="badge badge-settled" style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                ACTIVE
                              </span>
                            ) : (
                              <span className="badge badge-reversed" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
                                INACTIVE
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {(cfg.royaltyBps / 100).toFixed(1)}% / {((10000 - cfg.royaltyBps) / 100).toFixed(1)}%
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(cfg.changedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <code style={{ fontSize: '0.72rem', color: '#1a73e8' }}>
                              {cfg.changedByUser?.email || cfg.changedByUserId || 'system'}
                            </code>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <code>{cfg.previousConfigId ? `${cfg.previousConfigId.substring(0, 8)}...` : 'ROOT'}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Explicit Confirmation Modal */}
          {showConfirmModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Confirm Financial Split Routing Change
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                  You are about to activate a new split configuration for scope <code>{licenseeId || 'PLATFORM DEFAULT'}</code>:
                </p>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <div>• <strong>Licensor Royalty:</strong> {bps} bps ({(bps / 100).toFixed(1)}%)</div>
                  <div>• <strong>Charity Gift Share:</strong> {10000 - bps} bps ({((10000 - bps) / 100).toFixed(1)}%)</div>
                  <div>• <strong>Previous Active Config:</strong> Will be deactivated (`isActive = false`) and chained in audit history.</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Applying Change...' : 'Confirm & Apply Change'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {token && <CharityReserveAdmin token={token} />}
        </div>
      )}

      {/* TAB: MERCH ENQUIRIES */}
      {activeAdminTab === 'MERCH_ENQUIRIES' && (
        <div>
          {/* Tab Context Header */}
          <div className="admin-tab-section-header">
            <div>
              <h2 className="admin-tab-section-title">Merchandise Enquiries</h2>
              <p className="admin-tab-section-desc">
                Custom bulk merchandise requests from the Merch Store. Respond, track, and manage enquiry lifecycle. Export to CRM.
              </p>
            </div>
            <div className="admin-stat-row">
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#f59e0b' }} />
                {merchEnquiries.filter((e) => e.status === 'PENDING').length} Pending
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#0ea5e9' }} />
                {merchEnquiries.filter((e) => e.status === 'RESPONDED').length} Responded
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#94a3b8' }} />
                {merchEnquiries.filter((e) => e.status === 'CLOSED').length} Closed
              </span>
            </div>
          </div>
          {/* Header Controls & Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Inquiries</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {merchEnquiries.length}
              </div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-amber, #F59E0B)', textTransform: 'uppercase', fontWeight: 600 }}>Awaiting Response</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-amber, #F59E0B)', marginTop: '0.25rem' }}>
                {merchEnquiries.filter((e) => e.status === 'PENDING').length}
              </div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-sky, #0ea5e9)', textTransform: 'uppercase', fontWeight: 600 }}>Responded / In Progress</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-sky, #0ea5e9)', marginTop: '0.25rem' }}>
                {merchEnquiries.filter((e) => e.status === 'RESPONDED').length}
              </div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Closed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {merchEnquiries.filter((e) => e.status === 'CLOSED').length}
              </div>
            </div>
          </div>

          {/* Search, Filter & Export Bar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="Search item, contact name, email, or requirements..."
                  value={merchSearch}
                  onChange={(e) => setMerchSearch(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-subtle)', padding: '3px', borderRadius: '6px' }}>
                  {['ALL', 'PENDING', 'RESPONDED', 'CLOSED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setMerchStatusFilter(st)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: merchStatusFilter === st ? '#1a73e8' : 'transparent',
                        color: merchStatusFilter === st ? '#ffffff' : 'var(--text-muted, #475569)',
                        boxShadow: merchStatusFilter === st ? '0 1px 2px rgba(26, 115, 232, 0.25)' : 'none',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={loadMerchEnquiries}
                  className="btn btn-secondary"
                  disabled={loadingMerch}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                >
                  {loadingMerch ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={exportMerchCsv}
                  className="btn btn-secondary"
                  disabled={filteredMerchEnquiries.length === 0}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                >
                  Export CSV ({filteredMerchEnquiries.length})
                </button>
              </div>
            </div>
          </div>

          {/* Enquiries List */}
          {loadingMerch ? (
            <div className="admin-loading-state">
              <span className="admin-spinner" />
              Loading merchandise enquiries...
            </div>
          ) : filteredMerchEnquiries.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <SvgPackage />
              </div>
              <div className="admin-empty-state-title">No Enquiries Found</div>
              <div className="admin-empty-state-desc">No merchandise enquiries match the selected filters. New enquiries from the Merch Store will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredMerchEnquiries.map((enq) => {
                const isPending = enq.status === 'PENDING';
                const isResponded = enq.status === 'RESPONDED';
                const isClosed = enq.status === 'CLOSED';
                const isUpdating = updatingMerchId === enq.id;

                return (
                  <div
                    key={enq.id}
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      borderLeft: `4px solid ${isPending ? 'var(--color-amber, #F59E0B)' : isResponded ? 'var(--color-sky, #0ea5e9)' : 'var(--text-muted)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                            {enq.itemTitle}
                          </h3>
                          <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {enq.itemId}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: isPending ? 'rgba(245, 158, 11, 0.12)' : isResponded ? 'rgba(14, 165, 233, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                              color: isPending ? '#F59E0B' : isResponded ? '#0EA5E9' : '#94A3B8',
                              border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : isResponded ? 'rgba(14, 165, 233, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                            }}
                          >
                            {enq.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          Submitted: {new Date(enq.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Quick Status Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleUpdateMerchStatus(enq.id, 'RESPONDED')}
                            disabled={isUpdating}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--color-sky, #0ea5e9)', borderColor: 'rgba(14, 165, 233, 0.3)' }}
                          >
                            {isUpdating ? 'Saving...' : 'Mark as Responded'}
                          </button>
                        )}
                        {!isClosed ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateMerchStatus(enq.id, 'CLOSED')}
                            disabled={isUpdating}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                          >
                            {isUpdating ? 'Saving...' : 'Close Enquiry'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateMerchStatus(enq.id, 'PENDING')}
                            disabled={isUpdating}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                          >
                            {isUpdating ? 'Saving...' : 'Reopen Enquiry'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Customer Info & Message Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Customer Name</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>{enq.contactName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Customer Email</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <a href={`mailto:${enq.contactEmail}`} style={{ fontSize: '0.9rem', color: 'var(--color-sky, #0ea5e9)', textDecoration: 'none', wordBreak: 'break-all' }}>
                            {enq.contactEmail}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyMerchEmail(enq.contactEmail)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-light)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {copiedMerchEmail === enq.contactEmail ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Order Requirements / Message</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {enq.message}
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes Box */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Internal admin notes (e.g. quote sent £X, awaiting supplier sample...)"
                        value={merchNotesState[enq.id] || ''}
                        onChange={(e) => setMerchNotesState({ ...merchNotesState, [enq.id]: e.target.value })}
                        style={{ flex: 1, minWidth: '240px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveMerchNotes(enq.id)}
                        disabled={isUpdating}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.5rem 0.85rem' }}
                      >
                        {isUpdating ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOM KEEPSAKE ORDERS FULFILMENT */}
      {activeAdminTab === 'KEEPSAKE_ORDERS' && (
        <div>
          {/* Tab Context Header */}
          <div className="admin-tab-section-header">
            <div>
              <h2 className="admin-tab-section-title">Custom Keepsake Fulfillment</h2>
              <p className="admin-tab-section-desc">
                Manage and update the fulfillment status and tracking for personalised keepsake garment orders.
              </p>
            </div>
            <div className="admin-stat-row">
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#f59e0b' }} />
                {keepsakeOrders.filter((o) => o.fulfillmentStatus === 'PENDING').length} Pending
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#0ea5e9' }} />
                {keepsakeOrders.filter((o) => o.fulfillmentStatus === 'SHIPPED').length} Shipped
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#10b981' }} />
                {keepsakeOrders.filter((o) => o.fulfillmentStatus === 'DELIVERED').length} Delivered
              </span>
            </div>
          </div>
          {keepsakeUpdateError && (
            <div className="admin-inline-error" style={{ marginBottom: '1rem' }}>
              <SvgAlertCircle />
              <span>{keepsakeUpdateError}</span>
            </div>
          )}
          {/* Header & Filter Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['ALL', 'PENDING', 'SHIPPED', 'DELIVERED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setKeepsakeStatusFilter(status)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    borderColor: keepsakeStatusFilter === status ? '#1a73e8' : 'var(--border-light, #e2e8f0)',
                    backgroundColor: keepsakeStatusFilter === status ? '#1a73e8' : 'transparent',
                    color: keepsakeStatusFilter === status ? '#ffffff' : 'var(--text-muted, #475569)',
                    boxShadow: keepsakeStatusFilter === status ? '0 1px 2px rgba(26, 115, 232, 0.25)' : 'none',
                  }}
                >
                  {status}
                  {status === 'ALL' && ` (${keepsakeOrders.length})`}
                  {status !== 'ALL' && ` (${keepsakeOrders.filter((o) => o.fulfillmentStatus === status).length})`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadKeepsakeOrders}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              disabled={loadingKeepsake}
            >
              {loadingKeepsake ? 'Refreshing...' : 'Refresh Orders'}
            </button>
          </div>

          {/* Table Container */}
          {loadingKeepsake ? (
            <div className="admin-loading-state">
              <span className="admin-spinner" />
              Loading custom keepsake orders...
            </div>
          ) : filteredKeepsakeOrders.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <SvgAward />
              </div>
              <div className="admin-empty-state-title">No Keepsake Orders</div>
              <div className="admin-empty-state-desc">No custom keepsake orders match the current filter ({keepsakeStatusFilter}).</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Created</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sport &amp; Garment</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Shipping Destination</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tracking Reference</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeepsakeOrders.map((order: any) => {
                    const addr = order.shippingAddress
                      ? typeof order.shippingAddress === 'string'
                        ? (() => { try { return JSON.parse(order.shippingAddress); } catch { return null; } })()
                        : order.shippingAddress
                      : null;
                    const isSaving = updatingKeepsakeId === order.id;

                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border-light)', verticalAlign: 'top' }}>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-GB')}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {order.id.slice(0, 8)}...
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{order.customerName || 'Anonymous'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)' }}>{order.customerEmail}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}>
                            {order.sportType || 'Standard'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Size: <strong>{order.garmentSize || 'M'}</strong>
                            {order.primaryColourHex && (
                              <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: order.primaryColourHex, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
                                <code>{order.primaryColourHex}</code>
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', minWidth: '180px' }}>
                          {addr ? (
                            <div style={{ fontSize: '0.78rem', lineHeight: '1.35', color: 'var(--text-main)' }}>
                              {addr.recipientName && <div style={{ fontWeight: 600 }}>{addr.recipientName}</div>}
                              <div>{addr.street || addr.addressLine1}</div>
                              <div>{[addr.city, addr.postalCode].filter(Boolean).join(', ')}</div>
                              <div style={{ color: 'var(--text-muted)' }}>{addr.country}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No address recorded</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={keepsakeStatusState[order.id] || order.fulfillmentStatus || 'PENDING'}
                            onChange={(e) => setKeepsakeStatusState((prev) => ({ ...prev, [order.id]: e.target.value }))}
                            className="form-input"
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-card)',
                              color:
                                (keepsakeStatusState[order.id] || order.fulfillmentStatus) === 'DELIVERED'
                                  ? 'var(--color-green, #10b981)'
                                  : (keepsakeStatusState[order.id] || order.fulfillmentStatus) === 'SHIPPED'
                                  ? 'var(--color-sky, #38bdf8)'
                                  : 'var(--color-amber, #f59e0b)',
                            }}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', minWidth: '180px' }}>
                          <input
                            type="text"
                            placeholder="Enter courier tracking #"
                            value={keepsakeTrackingState[order.id] ?? ''}
                            onChange={(e) => setKeepsakeTrackingState((prev) => ({ ...prev, [order.id]: e.target.value }))}
                            className="form-input"
                            style={{ width: '100%', fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateKeepsakeOrder(order.id)}
                            disabled={isSaving}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
                          >
                            {isSaving ? 'Updating...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: STANDARD SOUVENIR / MERCH ORDERS */}
      {activeAdminTab === 'MERCH_ORDERS' && (
        <div>
          {/* Tab Context Header */}
          <div className="admin-tab-section-header">
            <div>
              <h2 className="admin-tab-section-title">Merchandise Order Fulfillment</h2>
              <p className="admin-tab-section-desc">
                Manage standard souvenir and print-on-demand merch orders. Update status, assign courier, enter tracking references, and set estimated delivery dates.
              </p>
            </div>
            <div className="admin-stat-row">
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#f59e0b' }} />
                {souvenirOrders.filter((o) => o.status === 'ORDER_PLACED' || o.status === 'QUEUED_FOR_PRINT' || o.status === 'IN_PRODUCTION').length} In Pipeline
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#0ea5e9' }} />
                {souvenirOrders.filter((o) => o.status === 'DISPATCHED').length} Dispatched
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#10b981' }} />
                {souvenirOrders.filter((o) => o.status === 'DELIVERED').length} Delivered
              </span>
            </div>
          </div>
          {souvenirUpdateError && (
            <div className="admin-inline-error" style={{ marginBottom: '1rem' }}>
              <SvgAlertCircle />
              <span>{souvenirUpdateError}</span>
            </div>
          )}
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['ALL', 'ORDER_PLACED', 'QUEUED_FOR_PRINT', 'IN_PRODUCTION', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSouvenirStatusFilter(status)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    borderColor: souvenirStatusFilter === status ? '#1a73e8' : 'var(--border-light, #e2e8f0)',
                    backgroundColor: souvenirStatusFilter === status ? '#1a73e8' : 'transparent',
                    color: souvenirStatusFilter === status ? '#ffffff' : 'var(--text-muted, #475569)',
                    boxShadow: souvenirStatusFilter === status ? '0 1px 2px rgba(26, 115, 232, 0.25)' : 'none',
                  }}
                >
                  {status.replace('_', ' ')}
                  {status === 'ALL' && ` (${souvenirOrders.length})`}
                  {status !== 'ALL' && ` (${souvenirOrders.filter((o) => o.status === status).length})`}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search order #, customer, item..."
                value={souvenirSearch}
                onChange={(e) => setSouvenirSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadSouvenirOrders(); }}
                className="form-input"
                style={{ width: '220px', fontSize: '0.78rem', padding: '0.4rem 0.65rem' }}
              />
              <button
                type="button"
                onClick={loadSouvenirOrders}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                disabled={loadingSouvenir}
              >
                {loadingSouvenir ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Orders Table Container */}
          {loadingSouvenir ? (
            <div className="admin-loading-state">
              <span className="admin-spinner" />
              Loading merchandise orders...
            </div>
          ) : souvenirOrders.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <SvgShoppingBag />
              </div>
              <div className="admin-empty-state-title">No Orders Found</div>
              <div className="admin-empty-state-desc">No merchandise orders match the current filters. New orders from the Merch Store will appear here.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Order #</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Item &amp; Total</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fulfillment Details</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {souvenirOrders.map((order: any) => {
                    const st = souvenirUpdateState[order.orderNumber] || {
                      status: order.status,
                      courier: order.courierName || '',
                      tracking: order.trackingNumber || '',
                      trackingUrl: order.trackingUrl || '',
                      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().slice(0, 10) : '',
                    };
                    const isSaving = updatingSouvenirId === order.orderNumber;

                    return (
                      <tr key={order.orderNumber} style={{ borderBottom: '1px solid var(--border-light)', verticalAlign: 'top' }}>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                            {order.orderNumber}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{order.customerName || 'Anonymous'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)' }}>{order.customerEmail}</div>
                          {(() => {
                            const shipAddr = typeof order.shippingAddress === 'string'
                              ? (() => { try { return JSON.parse(order.shippingAddress); } catch { return { street: order.shippingAddress }; } })()
                              : order.shippingAddress;
                            if (!shipAddr) return null;
                            const addrStr = [shipAddr.street, shipAddr.city, shipAddr.postalCode, shipAddr.country].filter(Boolean).join(', ');
                            return (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {addrStr.slice(0, 50)}{addrStr.length > 50 ? '...' : ''}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {order.eventName || order.itemTitle || order.itemType || 'NFTYLOGS'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Qty: {order.logoDropCount || order.quantity || 1} · Total: <strong style={{ color: 'var(--color-green, #10b981)' }}>£{order.grossAmountCents ? (order.grossAmountCents / 100).toFixed(2) : (order.totalGbp ? Number(order.totalGbp).toFixed(2) : '0.00')}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={st.status}
                            onChange={(e) =>
                              setSouvenirUpdateState((prev) => ({
                                ...prev,
                                [order.orderNumber]: { ...st, status: e.target.value },
                              }))
                            }
                            className="form-input"
                            style={{
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-card)',
                              color:
                                st.status === 'DELIVERED'
                                  ? 'var(--color-green, #10b981)'
                                  : st.status === 'DISPATCHED'
                                  ? 'var(--color-sky, #38bdf8)'
                                  : st.status === 'CANCELLED'
                                  ? '#ef4444'
                                  : 'var(--color-amber, #f59e0b)',
                            }}
                          >
                            <option value="ORDER_PLACED">ORDER_PLACED</option>
                            <option value="SPLIT_DISBURSED">SPLIT_DISBURSED</option>
                            <option value="QUEUED_FOR_PRINT">QUEUED_FOR_PRINT</option>
                            <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                            <option value="QUALITY_INSPECTED">QUALITY_INSPECTED</option>
                            <option value="DISPATCHED">DISPATCHED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', minWidth: '240px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            <input
                              type="text"
                              placeholder="Courier (DHL, Royal Mail)"
                              value={st.courier}
                              onChange={(e) =>
                                setSouvenirUpdateState((prev) => ({
                                  ...prev,
                                  [order.orderNumber]: { ...st, courier: e.target.value },
                                }))
                              }
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Tracking #"
                              value={st.tracking}
                              onChange={(e) =>
                                setSouvenirUpdateState((prev) => ({
                                  ...prev,
                                  [order.orderNumber]: { ...st, tracking: e.target.value },
                                }))
                              }
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                            <input
                              type="text"
                              placeholder="Tracking URL"
                              value={st.trackingUrl}
                              onChange={(e) =>
                                setSouvenirUpdateState((prev) => ({
                                  ...prev,
                                  [order.orderNumber]: { ...st, trackingUrl: e.target.value },
                                }))
                              }
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                            />
                            <input
                              type="date"
                              title="Estimated Delivery"
                              value={st.estimatedDelivery}
                              onChange={(e) =>
                                setSouvenirUpdateState((prev) => ({
                                  ...prev,
                                  [order.orderNumber]: { ...st, estimatedDelivery: e.target.value },
                                }))
                              }
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateSouvenirOrder(order.orderNumber)}
                            disabled={isSaving}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
                          >
                            {isSaving ? 'Updating...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: CHARITY PORTFOLIO & APPLICATION QUEUE */}
      {activeAdminTab === 'EMISSION_FACTORS' && token && <EmissionFactorsAdmin token={token} />}

      {activeAdminTab === 'FLEET_SETUP' && token && <FleetSetupRequestsAdmin token={token} />}

      {activeAdminTab === 'FLEET_DEVICES' && token && <FleetProvidersAdmin token={token} />}
      {activeAdminTab === 'MERCH_PRICES' && token && <MerchProductsAdmin token={token} />}
      {activeAdminTab === 'MARKET_INPUTS' && token && <MarketIndicesAdmin token={token} />}
      {activeAdminTab === 'ANCHORS' && token && <AnchorsAdmin token={token} />}
      {activeAdminTab === 'WEATHER_WEAR' && token && <WeatherWearAdmin token={token} />}

      {activeAdminTab === 'DELIVERY_PARTNERS' && token && <DeliveryPartnersAdmin token={token} />}
      {activeAdminTab === 'NEWSLETTER' && token && <NewsletterAdmin token={token} />}
      {activeAdminTab === 'MAINTENANCE_MODEL' && token && <MaintenanceModelAdmin token={token} />}

      {activeAdminTab === 'CHARITIES' && (
        <div>
          {/* Tab Context Header */}
          <div className="admin-tab-section-header">
            <div>
              <h2 className="admin-tab-section-title">Charity Portfolio & Application Queue</h2>
              <p className="admin-tab-section-desc">
                Statutory beneficiary management. Approve charity applications for the 3-slot beneficiary model and monitor active contract cycles.
              </p>
            </div>
            <div className="admin-stat-row">
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#10b981' }} />
                {charityDashboard?.committedCount ?? 0} / {charityDashboard?.maxCapacity ?? 3} Active Slots
              </span>
              <span className="admin-stat-pill">
                <span className="admin-stat-pill-dot" style={{ backgroundColor: '#f59e0b' }} />
                {charityDashboard?.pendingApplications?.length ?? 0} Pending Applications
              </span>
            </div>
          </div>
          {error && (
            <div className="admin-inline-error" style={{ marginBottom: '1.25rem' }}>
              <SvgAlertCircle />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                <SvgClose size={12} />
              </button>
            </div>
          )}
          {/* Overview Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Statutory Beneficiary Slots</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {charityDashboard?.committedCount ?? 0} / {charityDashboard?.maxCapacity ?? 3}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {charityDashboard?.availableSlots ?? 0} slot{charityDashboard?.availableSlots === 1 ? '' : 's'} available
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Applications</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-sky)', marginTop: '0.25rem' }}>
                {charityDashboard?.pendingApplications?.length ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Awaiting executive review
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={loadCharityDashboard}
                disabled={loadingCharities}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', fontWeight: 700 }}
              >
                {loadingCharities ? 'Refreshing Dashboard...' : 'Refresh Charity Registry'}
              </button>
            </div>
          </div>

          {/* Section 1: Official Beneficiary Slots */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.85rem 0' }}>
              Active Charity Beneficiary Slots
            </h3>

            {loadingCharities ? (
              <div className="admin-loading-state">
                <span className="admin-spinner" />
                Loading charity registry...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {(charityDashboard?.slots || [
                  { slotNumber: 1, status: 'OPEN' },
                  { slotNumber: 2, status: 'OPEN' },
                  { slotNumber: 3, status: 'OPEN' },
                ]).map((slot: any) => {
                  const isOccupied = slot.status !== 'OPEN' && slot.name;

                  return (
                    <div
                      key={slot.slotNumber}
                      style={{
                        padding: '1.25rem',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '10px',
                        border: isOccupied ? '1px solid var(--border-light)' : '1px dashed var(--border-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Slot #{slot.slotNumber}
                          </span>
                          <span
                            className={
                              slot.status === 'ACTIVE'
                                ? 'badge badge-settled'
                                : slot.status === 'APPROVED_AWAITING_STRIPE'
                                ? 'badge badge-pending'
                                : 'badge'
                            }
                            style={{ fontSize: '0.7rem' }}
                          >
                            {slot.status || 'OPEN'}
                          </span>
                        </div>

                        {isOccupied ? (
                          <>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                              {slot.name}
                            </h4>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                              Registered Charity: <strong>{slot.registeredCharityNumber || 'N/A'}</strong>
                            </div>

                            <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                              Total Disbursed: <strong style={{ color: 'var(--color-green, #10b981)' }}>£{Number(slot.totalDisbursedGbp || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Contract Term: {slot.contractStartDate ? new Date(slot.contractStartDate).toLocaleDateString('en-GB') : '-'} to {slot.contractEndDate ? new Date(slot.contractEndDate).toLocaleDateString('en-GB') : '-'}
                            </div>

                            {slot.daysRemaining !== undefined && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: slot.expiringSoon ? '#ef4444' : 'var(--color-sky)', fontWeight: 600 }}>
                                {slot.daysRemaining} days remaining in statutory cycle
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Open Slot</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                              Available for approval from the pending applicant queue below.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Pending Applications Queue */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Pending Charity Applications
              </h3>
              {(charityDashboard?.committedCount ?? 0) >= (charityDashboard?.maxCapacity ?? 3) && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-amber, #f59e0b)', fontWeight: 600 }}>
                  Maximum capacity reached (3/3). Existing charity slot must conclude before approving new candidates.
                </span>
              )}
            </div>

            {loadingCharities ? (
              <div className="admin-loading-state">
                <span className="admin-spinner" />
                Loading applications...
              </div>
            ) : (charityDashboard?.pendingApplications || []).length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-state-icon">
                  <SvgHeart />
                </div>
                <div className="admin-empty-state-title">No Pending Applications</div>
                <div className="admin-empty-state-desc">No charity applications are currently awaiting executive clearance.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Application Date</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Charity Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Registration #</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contact Email</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mission Statement</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(charityDashboard?.pendingApplications || []).map((app: any) => {
                      const isApproving = approvingCharityId === app.id;
                      const capacityReached = (charityDashboard?.committedCount ?? 0) >= (charityDashboard?.maxCapacity ?? 3);

                      return (
                        <tr key={app.id} style={{ borderBottom: '1px solid var(--border-light)', verticalAlign: 'top' }}>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {app.name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace' }}>
                            {app.registeredCharityNumber}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <a href={`mailto:${app.contactEmail}`} style={{ color: 'var(--color-sky)', textDecoration: 'none' }}>
                              {app.contactEmail}
                            </a>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {app.statement || 'No mission statement provided.'}
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => handleApproveCharity(app.id)}
                              disabled={isApproving || capacityReached}
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', fontWeight: 700 }}
                              title={capacityReached ? 'Beneficiary slots at full capacity (3/3)' : 'Approve and clear for onboarding'}
                            >
                              {isApproving ? 'Approving...' : 'Approve Charity'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </React.Fragment>
    </div>
  );
};
