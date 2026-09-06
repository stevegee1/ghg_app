import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { StatusBadge } from '../components/StatusBadge';

interface MerchItem {
  id: string;
  title: string;
  licenseeId: string;
  partnerName: string;
  priceCents: number;
  imageUrl: string;
  category: string;
  description: string;
  objectPosition?: string;
}

const MERCH_CATALOG: MerchItem[] = [
  {
    id: 'item_nfty_cap',
    title: 'NFTY LOGS® Vagaries of GHG Emissions Embroidered Cap',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 2500, // £25.00
    imageUrl: '/images/merch/804c16c8-6d00-4596-b456-dfe607b635b7.jpeg',
    category: 'Official Headwear',
    description: 'Black structured cotton cap with high-density embroidered multi-color NFTY LOGS® Vagaries of GHG Emissions accountability badge.',
    objectPosition: 'center 0%',
  },
  {
    id: 'item_nfty_volcano_hoodie',
    title: 'NFTY LOGS® "Vibing The Vagaries" Heavyweight Hoodie',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 6500, // £65.00
    imageUrl: '/images/merch/a014f871-4e03-4f3d-a056-47f3f3dbe729.jpeg',
    category: 'Graphic Art Hoodies',
    description: 'Heavyweight black pullover hoodie with embroidered "Re-awakened Volcanoes, Melting Glaciers" chest artwork and dual GHG logo drops.',
    objectPosition: 'center 20%',
  },
  {
    id: 'item_nfty_tech_fleece',
    title: 'NFTY LOGS® Tech Fleece Full-Zip Performance Hoodie',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 7500, // £75.00
    imageUrl: '/images/merch/09acb896-19df-488f-9a9b-ac1241c6dc97.jpeg',
    category: 'Performance Apparel',
    description: 'Charcoal tech fleece full-zip hoodie with zippered sleeve utility pocket, tailored seamlines, and embroidered GHG accountability badges.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_arsenal_hoodie',
    title: 'NFTY LOGS® Arsenal FC Milestone Match Commemorative Hoodie',
    licenseeId: 'lic_arsenal_fc',
    partnerName: 'Arsenal FC Merchandise',
    priceCents: 8000, // £80.00
    imageUrl: '/images/merch/fa1c261d-9fd9-4cb7-a5c3-a4425c641db7.jpeg',
    category: 'Special Edition Sports',
    description: 'Commemorative dark fleece hoodie celebrating the 2025 West Ham derby milestone with embroidered match narrative and official GHG badge.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_puffer_jacket',
    title: 'NFTY LOGS® Heavyweight Insulated Puffer Jacket',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 9500, // £95.00
    imageUrl: '/images/merch/5df490db-a560-4754-924d-9a27581f0c23.jpeg',
    category: 'Premium Winterwear',
    description: 'High-loft quilted puffer jacket with full-length storm zip, insulated hood, and embroidered NFTY LOGS® Greenhouse Gas accountability mark.',
    objectPosition: 'center 20%',
  },
  {
    id: 'item_nfty_softshell_vest',
    title: 'NFTY LOGS® Web3 Provenance Embroidered Softshell Vest',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 5500, // £55.00
    imageUrl: '/images/merch/ca6c871a-d643-4695-a605-9a357fb26ae3.jpeg',
    category: 'Official Outerwear',
    description: 'Sleeveless softshell vest embroidered with direct blockchain collectibles search paths for OpenSea, Rarible, and NFTY LOGS Labs.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_softshell_vest_back',
    title: 'NFTY LOGS® Disaster Relief Charity Edition Softshell Vest',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 5500, // £55.00
    imageUrl: '/images/merch/3bf3f794-fcb4-412a-a556-b3289bbebd39.jpeg',
    category: 'Official Outerwear',
    description: 'Embroidered with worldwide extreme weather survivor succour donation mandate and "While..." prompt blockchain collectibles statement.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_joggers',
    title: 'NFTY LOGS® Premium Embroidered Fleece Joggers',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 4500, // £45.00
    imageUrl: '/images/merch/66e17346-415e-4f20-9c86-3aa5c4587af6.jpeg',
    category: 'Loungewear & Bottoms',
    description: 'Organic heavyweight French terry fleece sweatpants with embroidered NFTY LOGS® Vagaries of Greenhouse Gases [GHGs] thigh badge.',
    objectPosition: 'center 15%',
  },
  {
    id: 'item_nfty_puffer_sleeve',
    title: 'NFTY LOGS® Arm-Badge Puffer Jacket (Sleeve Detail Edition)',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 9500, // £95.00
    imageUrl: '/images/merch/82ccfad7-9e7b-4882-990d-f9805bc52a22.jpeg',
    category: 'Premium Winterwear',
    description: 'Close-up sleeve edition showcasing the intricate multi-thread embroidery of the official NFTY LOGS® Vagaries of Greenhouse Gases mark.',
    objectPosition: 'center center',
  },
];

const GARMENT_OPTIONS = [
  { id: 'T_SHIRT', label: 'Organic Cotton T-Shirt', supplierCostCents: 2200, priceCents: 2588, baseLca: 290, laborHours: 0.8 },
  { id: 'PUFF_JACKET', label: 'Recycled Down Puffer Jacket', supplierCostCents: 6500, priceCents: 7647, baseLca: 780, laborHours: 3.0 },
  { id: 'HOODIE', label: 'Heavyweight Commemorative Hoodie', supplierCostCents: 4200, priceCents: 4941, baseLca: 520, laborHours: 2.0 },
  { id: 'BACKPACK', label: 'Industrial Canvas Backpack', supplierCostCents: 3800, priceCents: 4471, baseLca: 680, laborHours: 2.2 },
  { id: 'SCHOOL_BAG', label: 'Student & Youth School Bag', supplierCostCents: 2800, priceCents: 3294, baseLca: 540, laborHours: 1.8 },
  { id: 'SOCKS', label: 'Performance Technical Socks', supplierCostCents: 1200, priceCents: 1412, baseLca: 120, laborHours: 0.5 },
  { id: 'HEAVYWEIGHT_HOODIE', label: 'Archival Matchday Hoodie', supplierCostCents: 4200, priceCents: 4941, baseLca: 520, laborHours: 2.0 },
  { id: 'INSULATED_PUFFER_JACKET', label: 'Extreme Climate Puffer Jacket', supplierCostCents: 6500, priceCents: 7647, baseLca: 780, laborHours: 3.0 },
  { id: 'STRUCTURED_CAP', label: 'Structured Cotton Cap', supplierCostCents: 1800, priceCents: 2118, baseLca: 210, laborHours: 1.0 },
];

const THREAD_COLORS = [
  { id: 'GOLD_METALLIC', label: 'Gold Metallic', hex: '#D4AF37', previewBg: '#2A2000' },
  { id: 'STERLING_SILVER', label: 'Sterling Silver', hex: '#E2E8F0', previewBg: '#1E293B' },
  { id: 'EMERALD_GREEN', label: 'Emerald Green', hex: '#10B981', previewBg: '#064E3B' },
  { id: 'PURE_WHITE', label: 'Pure White', hex: '#FFFFFF', previewBg: '#0F172A' },
];

const PLACEMENT_OPTIONS = [
  { id: 'LEFT_CHEST', label: 'Left Chest (Heart Placement)' },
  { id: 'RIGHT_SLEEVE', label: 'Right Sleeve (Match Derby Mark)' },
  { id: 'BACK_COLLAR', label: 'Back Collar (Heritage Inscription)' },
];

const PRESET_CLUBS = [
  'Arsenal FC',
  'Chelsea FC',
  'Liverpool FC',
  'Manchester City',
  'Tottenham Hotspur',
  'Aston Villa',
];

export const MerchStorePage: React.FC = () => {
  // Navigation mode
  const [activeTab, setActiveTab] = useState<'catalog' | 'goal_frenzy'>('catalog');

  // Standard Catalog State
  const [selectedItem, setSelectedItem] = useState<MerchItem>(MERCH_CATALOG[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxImage, setLightboxImage] = useState<MerchItem | null>(null);

  // Goal Frenzy Studio State
  const [frenzyClub, setFrenzyClub] = useState<string>('Arsenal FC');
  const [customClub, setCustomClub] = useState<string>('');
  const [frenzyOpponent, setFrenzyOpponent] = useState<string>('West Ham United');
  const [frenzyMinute, setFrenzyMinute] = useState<string>("89'");
  const [frenzyMoment, setFrenzyMoment] = useState<string>('Derby match winner at Emirates Stadium');
  const [frenzyQuote, setFrenzyQuote] = useState<string>('89th Minute Winning Strike — North Bank Heritage');
  const [garmentModel, setGarmentModel] = useState<string>('HEAVYWEIGHT_HOODIE');
  const [threadColor, setThreadColor] = useState<string>('GOLD_METALLIC');
  const [placement, setPlacement] = useState<string>('LEFT_CHEST');
  const [frenzyQuantity, setFrenzyQuantity] = useState<number>(1);

  // Live preview metrics from backend
  const [livePreview, setLivePreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Checkout State
  const [optInMark, setOptInMark] = useState<boolean>(true);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const categories = ['All', ...Array.from(new Set(MERCH_CATALOG.map((i) => i.category)))];
  const filteredItems = selectedCategory === 'All'
    ? MERCH_CATALOG
    : MERCH_CATALOG.filter((i) => i.category === selectedCategory);

  const activeClubName = customClub.trim() ? customClub.trim() : frenzyClub;
  const activeGarment = GARMENT_OPTIONS.find((g) => g.id === garmentModel) || GARMENT_OPTIONS[0];
  const activeThread = THREAD_COLORS.find((t) => t.id === threadColor) || THREAD_COLORS[0];
  const frenzyGrossCents = activeGarment.priceCents * frenzyQuantity;
  const frenzyCharityCents = Math.round(frenzyGrossCents * 0.15);
  const frenzyLicensorCents = frenzyGrossCents - frenzyCharityCents;

  // Fetch live preview from backend when Goal Frenzy inputs change
  useEffect(() => {
    let isCurrent = true;
    const fetchPreview = async () => {
      if (activeTab !== 'goal_frenzy') return;
      const textToInscribe = frenzyQuote.trim() || `${activeClubName} vs ${frenzyOpponent} ${frenzyMinute}`;
      if (!textToInscribe) return;
      setPreviewLoading(true);
      try {
        const res = await api.previewCustomKeepsake({
          garmentModel,
          inscribedText: textToInscribe.substring(0, 80),
          threadColor,
          placement,
          quantity: frenzyQuantity,
          unitPriceCents: activeGarment.priceCents,
        });
        if (isCurrent && res?.preview) {
          setLivePreview(res.preview);
        }
      } catch (err) {
        // Fall back to client calculation
      } finally {
        if (isCurrent) setPreviewLoading(false);
      }
    };

    const timer = setTimeout(fetchPreview, 300);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [activeTab, activeClubName, frenzyOpponent, frenzyMinute, frenzyQuote, garmentModel, threadColor, placement, frenzyQuantity]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 4);
    const formatted = val.length >= 3 ? `${val.substring(0, 2)}/${val.substring(2)}` : val;
    setCardExpiry(formatted);
  };

  // Standard Catalog Checkout
  const handleCatalogStripeHostedCheckout = async () => {
    if (!optInMark) {
      setError('Please check the GHG Accountability Mark opt-in box to proceed.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await api.createCheckoutSession({
        licenseeId: selectedItem.licenseeId,
        itemTitle: selectedItem.title,
        grossAmountCents: selectedItem.priceCents,
        currency: 'GBP',
      });
      if (session?.sessionUrl) {
        window.location.href = session.sessionUrl;
      } else {
        const result = await api.checkout({
          licenseeId: selectedItem.licenseeId,
          grossAmountCents: selectedItem.priceCents,
          checkoutReferenceId: `ref_merch_${Date.now()}`,
        });
        setSuccessResult(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Stripe checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleCatalogCardCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optInMark) {
      setError('Please check the GHG Accountability Mark opt-in box to proceed.');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid card number.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await api.checkout({
        licenseeId: selectedItem.licenseeId,
        grossAmountCents: selectedItem.priceCents,
        checkoutReferenceId: `ref_merch_${Date.now()}`,
      });
      setSuccessResult(result);
    } catch (err: any) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  // Goal Frenzy Studio Checkout
  const handleGoalFrenzyCheckout = async (isDirectCard: boolean) => {
    if (!optInMark) {
      setError('Please check the GHG Accountability Mark opt-in box to proceed.');
      return;
    }
    if (!activeClubName) {
      setError('Please select or specify your football club.');
      return;
    }
    const quoteText = frenzyQuote.trim() || `${activeClubName} ${frenzyMoment} (${frenzyMinute})`;
    if (quoteText.length > 80) {
      setError('Embroidery quote must be 80 characters or fewer.');
      return;
    }
    if (isDirectCard && cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid card number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.checkoutCustomKeepsake({
        licenseeId: 'lic_ghg_official',
        garmentModel,
        inscribedText: quoteText,
        threadColor,
        placement,
        quantity: frenzyQuantity,
        unitPriceCents: activeGarment.priceCents,
        currency: 'GBP',
        checkoutReferenceId: `frenzy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isGoalFrenzy: true,
        frenzyClub: activeClubName,
        frenzyOpponent: frenzyOpponent || undefined,
        frenzyMinute: frenzyMinute || undefined,
        frenzyMoment: frenzyMoment || undefined,
        frenzyQuote: quoteText,
      });

      if (!isDirectCard && res?.sessionUrl) {
        window.location.href = res.sessionUrl;
        return;
      }

      setSuccessResult({
        transactionId: res.transactionId,
        grossAmountCents: res.financialSummary?.grossAmountCents || frenzyGrossCents,
        charityGiftCents: res.financialSummary?.charityGiftCents || frenzyCharityCents,
        licensorRoyaltyCents: res.financialSummary?.licensorRoyaltyCents || frenzyLicensorCents,
        keepsakeSpec: res.keepsakeSpec,
      });
    } catch (err: any) {
      setError(err.message || 'Goal Frenzy order failed to initiate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--accent-light)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-sky)',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          <span className="radar-pulse" />
          <span>GHG EMISSIONS REGISTERED TRADE MARK</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          Survivors Donation Keepsake
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: '780px', margin: 0 }}>
          Certified bespoke apparel and disaster survivor keepsakes. Unit prices are determined by supplier base production specifications, with an immediate contractual 85% supplier fulfillment / 15% statutory charity split at checkout.
        </p>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('catalog');
              setSuccessResult(null);
              setError(null);
            }}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'catalog' ? 'var(--color-sky)' : 'transparent',
              color: activeTab === 'catalog' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            Survivors Keepsake Catalog
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('goal_frenzy');
              setSuccessResult(null);
              setError(null);
            }}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'goal_frenzy' ? 'none' : '1px solid var(--border-light)',
              backgroundColor: activeTab === 'goal_frenzy' ? '#0F172A' : 'var(--bg-card)',
              color: activeTab === 'goal_frenzy' ? '#38BDF8' : 'var(--text-main)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
            Goal Frenzy™ Sports Studio
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* TAB 1: OFFICIAL MERCH CATALOG */}
      {activeTab === 'catalog' && (
        <>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.5rem 1.15rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedCategory === cat ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                  backgroundColor: selectedCategory === cat ? 'var(--accent-light)' : 'var(--bg-card)',
                  color: selectedCategory === cat ? 'var(--color-sky)' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Full Photo Lightbox Modal */}
          {lightboxImage && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
              }}
              onClick={() => setLightboxImage(null)}
            >
              <div
                style={{
                  position: 'relative',
                  maxWidth: '720px',
                  width: '100%',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-light)',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ position: 'relative', height: '480px', backgroundColor: '#020617' }}>
                  <img
                    src={lightboxImage.imageUrl}
                    alt={lightboxImage.title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxImage(null)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)', fontWeight: 800, textTransform: 'uppercase' }}>
                    {lightboxImage.category}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.25rem 0' }}>{lightboxImage.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{lightboxImage.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Responsive Store Layout */}
          <div className="store-layout-grid">
            
            {/* Left Column: Product Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="persefoni-card"
                  style={{
                    border: selectedItem.id === item.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{ position: 'relative', height: '240px', backgroundColor: 'var(--bg-subtle)', cursor: 'pointer', overflow: 'hidden' }}
                    onClick={() => setLightboxImage(item)}
                    title="Click to zoom image"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: item.objectPosition || 'center center',
                        transition: 'transform 0.3s ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      Embroidered Mark
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#94a3b8',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    >
                      Zoom View
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        {item.category}
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.35rem 0' }}>{item.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
                        {item.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        £{(item.priceCents / 100).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setSuccessResult(null);
                        }}
                        className={selectedItem.id === item.id ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', minHeight: '38px' }}
                      >
                        {selectedItem.id === item.id ? 'Selected' : 'Select Item'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Checkout Panel */}
            <div className="persefoni-card" style={{ padding: '1.75rem', position: 'sticky', top: '100px' }}>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  Order & ESG Routing
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Complete purchase with automated 15% charity split
                </p>
              </div>

              {successResult ? (
                <div>
                  <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '1rem' }}>Order Placed & Payment Settled</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      Transaction: <code>{successResult.transactionId}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
                    <StatusBadge status="SETTLED" />
                  </div>

                  <div style={{ margin: '1rem 0' }}>
                    <OpenSeaBadge transactionId={successResult.transactionId} licenseeId={selectedItem.licenseeId} />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <FinancialSplitBar
                      grossAmountCents={successResult.grossAmountCents}
                      licensorRoyaltyCents={successResult.licensorRoyaltyCents}
                      charityGiftCents={successResult.charityGiftCents}
                    />
                  </div>

                  <button
                    onClick={() => setSuccessResult(null)}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '1.25rem' }}
                  >
                    Purchase Another Item
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCatalogCardCheckout}>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{selectedItem.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedItem.partnerName}</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-sky)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                      £{(selectedItem.priceCents / 100).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', gap: '0.65rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={optInMark}
                        onChange={(e) => setOptInMark(e.target.checked)}
                        style={{ marginTop: '0.15rem', accentColor: 'var(--color-green)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>Verified GHG Accountability Mark</div>
                        <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                          Exact 15% of purchase is automatically routed to verified local environmental restoration funds.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Payment Details
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        256-Bit SSL Encrypted
                      </span>
                    </div>

                    <div style={{ marginBottom: '0.65rem' }}>
                      <input
                        type="text"
                        required
                        placeholder="Card number (4242 •••• •••• ••••)"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <input
                        type="text"
                        required
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                      <input
                        type="password"
                        required
                        maxLength={4}
                        placeholder="CVC"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  {/* Stripe Hosted Checkout (Primary Option) */}
                  <button
                    type="button"
                    onClick={handleCatalogStripeHostedCheckout}
                    disabled={loading || !optInMark}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      backgroundColor: '#635BFF',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 12px rgba(99, 91, 255, 0.25)',
                    }}
                  >
                    <span>Pay with Stripe</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>(Cards, Apple Pay, Google Pay)</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR PAY DIRECTLY</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !optInMark}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Processing...' : `Pay £${(selectedItem.priceCents / 100).toFixed(2)} with Encrypted Card →`}
                  </button>
                </form>
              )}
            </div>

          </div>
        </>
      )}

      {/* TAB 2: GOAL FRENZY™ SPORTS MOMENT STUDIO */}
      {activeTab === 'goal_frenzy' && (
        <div>
          {/* Goal Frenzy Banner */}
          <div
            style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid #1E293B',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 600, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              <span>GOAL FRENZY™ SPORTS MILESTONE STUDIO</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em', color: '#F8FAFC' }}>
              Sports Milestone Commemoration Studio
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94A3B8', maxWidth: '780px', lineHeight: 1.55, margin: 0 }}>
              Configure bespoke commemorative club apparel celebrating milestone matches and defining moments. Every garment is crafted from certified organic textiles with ISO 14067 carbon accounting metrics and automated 15% statutory ESG charitable routing.
            </p>
          </div>

          {/* Goal Frenzy Studio Layout Grid */}
          <div className="store-layout-grid">
            
            {/* Left Column: Interactive Moment Configurator */}
            <div>
              {/* Card 1: Sports Moment Definition */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  1. Match & moment details
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
                  Specify the club, opponent, and decisive match minute.
                </p>

                {/* Club Preset Buttons */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Select Club
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {PRESET_CLUBS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setFrenzyClub(c);
                          setCustomClub('');
                        }}
                        style={{
                          padding: '0.45rem 0.95rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: frenzyClub === c && !customClub ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                          backgroundColor: frenzyClub === c && !customClub ? 'var(--accent-light)' : 'var(--bg-subtle)',
                          color: frenzyClub === c && !customClub ? 'var(--color-sky)' : 'var(--text-main)',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or enter custom club (e.g. Newcastle United, Celtic FC)"
                    value={customClub}
                    onChange={(e) => setCustomClub(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Opponent & Minute */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Opponent / Derby Rival
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tottenham Hotspur, West Ham"
                      value={frenzyOpponent}
                      onChange={(e) => setFrenzyOpponent(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Match Minute
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 89', 90+4', Extra Time"
                      value={frenzyMinute}
                      onChange={(e) => setFrenzyMinute(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Moment Description */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Defining Moment Narrative
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stoppage-time curling strike into top corner at the Emirates"
                    value={frenzyMoment}
                    onChange={(e) => setFrenzyMoment(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Inscription Quote */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Embroidered Fan Inscription (Max 80 chars)
                    </label>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: frenzyQuote.length > 80 ? 'var(--google-red)' : 'var(--text-muted)' }}>
                      {frenzyQuote.length}/80
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Absolute limbs in the North Bank! We never gave up."
                    value={frenzyQuote}
                    onChange={(e) => setFrenzyQuote(e.target.value)}
                    className="form-input"
                    style={{ fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Card 2: Garment Model & Specs */}
              <div className="persefoni-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  2. Eco-Garment & Embroidery Specs
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
                  Select silhouette, organic thread color, and embroidery placement.
                </p>

                {/* Garment Grid */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Garment Silhouette
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {GARMENT_OPTIONS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGarmentModel(g.id)}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '10px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          border: garmentModel === g.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                          backgroundColor: garmentModel === g.id ? 'var(--accent-light)' : 'var(--bg-subtle)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{g.label}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                            £{(g.priceCents / 100).toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {g.baseLca}g CO2e
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thread Color */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    3D Embroidery Thread Color
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                    {THREAD_COLORS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThreadColor(t.id)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          cursor: 'pointer',
                          border: threadColor === t.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: t.hex, border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Placement */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Embroidery Placement
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                    {PLACEMENT_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlacement(p.id)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: placement === p.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                          backgroundColor: placement === p.id ? 'var(--accent-light)' : 'var(--bg-subtle)',
                          color: placement === p.id ? 'var(--color-sky)' : 'var(--text-main)',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Live Stitch Texture Canvas Simulation */}
              <div className="persefoni-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    Live Embroidery Canvas Preview
                  </h3>
                  <span style={{ fontSize: '0.6875rem', backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 600 }}>
                    {placement}
                  </span>
                </div>

                {/* Realistic Simulated Stitch Fabric */}
                <div
                  style={{
                    backgroundColor: '#090D16',
                    backgroundImage: 'radial-gradient(#1E293B 1px, transparent 1px)',
                    backgroundSize: '8px 8px',
                    borderRadius: '10px',
                    padding: '1.75rem 1.25rem',
                    border: '1px solid #1E293B',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {activeGarment.label} • {activeClubName}
                  </div>

                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      fontFamily: 'Cinzel, Georgia, serif',
                      color: activeThread.hex,
                      textShadow: `0 0 8px ${activeThread.hex}66, 1px 1px 0px rgba(0,0,0,0.8)`,
                      letterSpacing: '0.03em',
                      maxWidth: '90%',
                      margin: '0.5rem 0',
                      lineHeight: 1.4,
                    }}
                  >
                    "{frenzyQuote.trim() || `${activeClubName} vs ${frenzyOpponent} ${frenzyMinute}`}"
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#CBD5E1', fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 600 }}>
                      MATCH: {frenzyOpponent || 'Derby'}
                    </span>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#CBD5E1', fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 600 }}>
                      MIN: {frenzyMinute || '90+'}
                    </span>
                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80', fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                      15% ESG ALLOCATED
                    </span>
                  </div>
                </div>

                {/* Dual Impact ISO Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>ISO 14067 LCA Carbon</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                      {livePreview?.dualImpactMetrics?.estimatedLcaCarbonGrams ?? (activeGarment.baseLca * frenzyQuantity)} g CO2e
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Artisan Hand Labor</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                      {livePreview?.dualImpactMetrics?.artisanLaborHours ?? (activeGarment.laborHours * frenzyQuantity)} hrs
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fabric Standard</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-green-dark)', marginTop: '0.2rem' }}>
                      100% Organic Cotton
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Goal Frenzy Checkout Panel */}
            <div className="persefoni-card" style={{ padding: '1.75rem', position: 'sticky', top: '100px' }}>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-sky)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Goal Frenzy™ Milestone Order
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0 0.25rem 0' }}>
                  Bespoke Commemoration
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Custom embroidery with verified 15% ESG charitable routing
                </p>
              </div>

              {successResult ? (
                <div>
                  <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '1rem' }}>Goal Frenzy Order Initiated!</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      Transaction: <code>{successResult.transactionId}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
                    <StatusBadge status="SETTLED" />
                  </div>

                  <div style={{ margin: '1rem 0' }}>
                    <OpenSeaBadge transactionId={successResult.transactionId} licenseeId="lic_ghg_official" />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <FinancialSplitBar
                      grossAmountCents={successResult.grossAmountCents}
                      licensorRoyaltyCents={successResult.licensorRoyaltyCents}
                      charityGiftCents={successResult.charityGiftCents}
                    />
                  </div>

                  <button
                    onClick={() => setSuccessResult(null)}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '1.25rem' }}
                  >
                    Customize Another Milestone
                  </button>
                </div>
              ) : (
                <div>
                  {/* Order Summary Box */}
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      {activeClubName} — {activeGarment.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Thread: {activeThread.label} • Placement: {placement}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quantity:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setFrenzyQuantity(Math.max(1, frenzyQuantity - 1))}
                          style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{frenzyQuantity}</span>
                        <button
                          type="button"
                          onClick={() => setFrenzyQuantity(frenzyQuantity + 1)}
                          style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-sky)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      £{(frenzyGrossCents / 100).toFixed(2)}
                    </div>
                  </div>

                  {/* 85/15 Financial Split Preview */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Financial Routing (85/15 Mandate)
                    </div>
                    <FinancialSplitBar
                      grossAmountCents={frenzyGrossCents}
                      licensorRoyaltyCents={frenzyLicensorCents}
                      charityGiftCents={frenzyCharityCents}
                    />
                  </div>

                  {/* Accountability Opt-in */}
                  <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', gap: '0.65rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={optInMark}
                        onChange={(e) => setOptInMark(e.target.checked)}
                        style={{ marginTop: '0.15rem', accentColor: 'var(--color-green)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>Verified GHG Accountability Mark</div>
                        <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                          Exact £{(frenzyCharityCents / 100).toFixed(2)} (15%) automatically routed to verified community and reforestation partners.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Payment Details */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Payment Details
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        256-Bit SSL Encrypted
                      </span>
                    </div>

                    <div style={{ marginBottom: '0.65rem' }}>
                      <input
                        type="text"
                        placeholder="Card number (4242 •••• •••• ••••)"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="CVC"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  {/* Primary Stripe Button */}
                  <button
                    type="button"
                    onClick={() => handleGoalFrenzyCheckout(false)}
                    disabled={loading || !optInMark}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      backgroundColor: '#635BFF',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 12px rgba(99, 91, 255, 0.25)',
                    }}
                  >
                    <span>Pay with Stripe</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>(Cards, Apple Pay, Google Pay)</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR PAY DIRECTLY</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
                  </div>

                  {/* Direct Encrypted Card Button */}
                  <button
                    type="button"
                    onClick={() => handleGoalFrenzyCheckout(true)}
                    disabled={loading || !optInMark}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Processing...' : `Pay £${(frenzyGrossCents / 100).toFixed(2)} with Encrypted Card →`}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
