import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { StatusBadge } from '../components/StatusBadge';

interface MerchItem {
  id: string;
  title: string;
  licenseeId: string;
  partnerName: string;
  priceCents: number | null; // null = price not yet determined, shows Contact for Order
  imageUrl: string;
  category: string;
  description: string;
  objectPosition?: string;
}

const CAP_ITEM_ID = 'item_nfty_cap';

const MERCH_CATALOG: MerchItem[] = [
  {
    id: 'item_nfty_cap',
    title: 'NFTY LOGS® Vagaries of GHG Emissions Embroidered Cap',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 3500, // £35.00 - fixed retail price
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
    priceCents: null, // price TBC - contact for order
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
  { id: 'SIGNATURE_MAGENTA', label: 'Signature Magenta', hex: '#FF2D8D', previewBg: '#111726' },
  { id: 'STERLING_SILVER', label: 'Sterling Silver', hex: '#E2E8F0', previewBg: '#111726' },
  { id: 'PURE_WHITE', label: 'Pure White', hex: '#FFFFFF', previewBg: '#111726' },
  { id: 'OBSIDIAN_SLATE', label: 'Obsidian Slate', hex: '#94A3B8', previewBg: '#111726' },
];

const PLACEMENT_OPTIONS = [
  { id: 'LEFT_CHEST', label: 'Left Chest (Heart Placement)' },
  { id: 'RIGHT_SLEEVE', label: 'Right Sleeve (Match Derby Mark)' },
  { id: 'BACK_COLLAR', label: 'Back Collar (Heritage Inscription)' },
];

export interface SportDefinition {
  id: string;
  name: string;
  teamLabel: string;
  presetClubs: string[];
  defaultTeam: string;
  defaultOpponent: string;
  defaultMinute: string;
  opponentLabel: string;
  opponentPlaceholder: string;
  minuteLabel: string;
  minutePlaceholder: string;
  momentPlaceholder: string;
  defaultQuote: string;
}

const MAJOR_SPORTS: SportDefinition[] = [
  {
    id: 'football',
    name: 'Football (Soccer)',
    teamLabel: 'Football Club',
    presetClubs: [
      'Arsenal FC',
      'Chelsea FC',
      'Liverpool FC',
      'Manchester City',
      'Manchester United',
      'Real Madrid',
      'FC Barcelona',
      'Bayern Munich',
      'Paris Saint-Germain',
    ],
    defaultTeam: 'Arsenal FC',
    defaultOpponent: 'West Ham United',
    defaultMinute: "89'",
    opponentLabel: 'Opponent / Derby Rival',
    opponentPlaceholder: 'e.g. West Ham United, Tottenham Hotspur',
    minuteLabel: 'Match Minute / Stoppage',
    minutePlaceholder: "e.g. 89', 90+4', Extra Time",
    momentPlaceholder: 'e.g. Stoppage-time curling strike into top corner at the Emirates',
    defaultQuote: '89th Minute Winning Strike - North Bank Heritage',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    teamLabel: 'Basketball Franchise',
    presetClubs: [
      'Los Angeles Lakers',
      'Boston Celtics',
      'Golden State Warriors',
      'Chicago Bulls',
      'Miami Heat',
      'New York Knicks',
      'Dallas Mavericks',
      'Denver Nuggets',
    ],
    defaultTeam: 'Los Angeles Lakers',
    defaultOpponent: 'Boston Celtics',
    defaultMinute: 'Q4 0.8s',
    opponentLabel: 'Opponent / Conference Rival',
    opponentPlaceholder: 'e.g. Boston Celtics, Golden State Warriors',
    minuteLabel: 'Quarter & Game Clock',
    minutePlaceholder: 'e.g. Q4 0.8s, Double OT, Finals Game 7',
    momentPlaceholder: 'e.g. Buzzer-beater stepback three from the logo to clinch the championship',
    defaultQuote: 'Finals Game 7 Buzzer Beater - World Championship',
  },
  {
    id: 'american_football',
    name: 'American Football',
    teamLabel: 'Football Franchise',
    presetClubs: [
      'Kansas City Chiefs',
      'San Francisco 49ers',
      'Dallas Cowboys',
      'Philadelphia Eagles',
      'Green Bay Packers',
      'New England Patriots',
      'Buffalo Bills',
      'Baltimore Ravens',
    ],
    defaultTeam: 'Kansas City Chiefs',
    defaultOpponent: 'San Francisco 49ers',
    defaultMinute: 'Q4 0:03',
    opponentLabel: 'Opponent / Divisional Rival',
    opponentPlaceholder: 'e.g. San Francisco 49ers, Dallas Cowboys',
    minuteLabel: 'Quarter & Drive Clock',
    minutePlaceholder: 'e.g. Q4 0:03, Overtime 4th & Goal',
    momentPlaceholder: 'e.g. 4th-and-goal game-winning touchdown pass with 3 seconds remaining',
    defaultQuote: '4th Quarter Game Winning Drive - Super Bowl Glory',
  },
  {
    id: 'motorsport',
    name: 'Formula 1 & Motorsport',
    teamLabel: 'Racing Constructor / Team',
    presetClubs: [
      'Scuderia Ferrari',
      'Mercedes-AMG Petronas F1',
      'Red Bull Racing',
      'McLaren Formula 1 Team',
      'Aston Martin Aramco F1',
      'Williams Racing',
      'Alpine F1 Team',
    ],
    defaultTeam: 'Scuderia Ferrari',
    defaultOpponent: 'Monza Italian Grand Prix',
    defaultMinute: 'Lap 53/53',
    opponentLabel: 'Grand Prix / Circuit',
    opponentPlaceholder: 'e.g. Silverstone British GP, Monaco GP, Monza',
    minuteLabel: 'Lap / Race Sector',
    minutePlaceholder: 'e.g. Lap 53/53, Final Sector, Chequered Flag',
    momentPlaceholder: 'e.g. Dramatic final-lap outside overtake into Parabolica for the win',
    defaultQuote: 'Final Lap Victory at Monza - Tifosi Heritage',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    teamLabel: 'Major Tournament / Club',
    presetClubs: [
      'Wimbledon Championships',
      'Roland Garros (French Open)',
      'US Open Championship',
      'Australian Open',
      'ATP World Tour',
      'WTA Tour',
    ],
    defaultTeam: 'Wimbledon Championships',
    defaultOpponent: 'Center Court Finals',
    defaultMinute: 'Set 5 (9-7)',
    opponentLabel: 'Finals Opponent / Round',
    opponentPlaceholder: 'e.g. Novak Djokovic, Carlos Alcaraz, Finals',
    minuteLabel: 'Set & Championship Point',
    minutePlaceholder: 'e.g. Set 5 (9-7), Championship Point, Tiebreak',
    momentPlaceholder: 'e.g. 26-shot rally down-the-line passing winner on championship point',
    defaultQuote: 'Epic 5th Set Championship Point - Center Court Triumph',
  },
  {
    id: 'cricket',
    name: 'Cricket',
    teamLabel: 'Cricket Board / Club',
    presetClubs: [
      'England Cricket Board',
      'India National Cricket Team',
      'Australia National Cricket Team',
      'Mumbai Indians',
      'Chennai Super Kings',
      'Yorkshire County CC',
      'Surrey County CC',
    ],
    defaultTeam: 'England Cricket Board',
    defaultOpponent: 'Australia (The Ashes)',
    defaultMinute: 'Over 49.6',
    opponentLabel: 'Opponent / Test Series',
    opponentPlaceholder: 'e.g. Australia (The Ashes), World Cup Final',
    minuteLabel: 'Over & Ball / Session',
    minutePlaceholder: 'e.g. Over 49.6, Day 5 Final Session, Super Over',
    momentPlaceholder: 'e.g. Final-ball boundary six over long-off to seal the World Cup',
    defaultQuote: 'Final Over World Cup Boundary - Unbroken Stand',
  },
  {
    id: 'rugby',
    name: 'Rugby (Union & League)',
    teamLabel: 'Rugby Union / Club',
    presetClubs: [
      'New Zealand All Blacks',
      'South Africa Springboks',
      'England Rugby',
      'Ireland Rugby',
      'France Rugby',
      'Saracens RFC',
      'Leinster Rugby',
    ],
    defaultTeam: 'England Rugby',
    defaultOpponent: 'New Zealand All Blacks',
    defaultMinute: "79'",
    opponentLabel: 'Opponent / Championship Rival',
    opponentPlaceholder: 'e.g. New Zealand All Blacks, Six Nations Decider',
    minuteLabel: 'Match Minute / Stoppage',
    minutePlaceholder: "e.g. 79', 80+2' Extra Time, Final Scrum",
    momentPlaceholder: 'e.g. Extra-time drop goal between uprights to claim the world title',
    defaultQuote: 'Extra Time Drop Goal - World Champion Mark',
  },
  {
    id: 'baseball',
    name: 'Baseball',
    teamLabel: 'Baseball Franchise',
    presetClubs: [
      'New York Yankees',
      'Los Angeles Dodgers',
      'Boston Red Sox',
      'Chicago Cubs',
      'Atlanta Braves',
      'Houston Astros',
      'Philadelphia Phillies',
    ],
    defaultTeam: 'New York Yankees',
    defaultOpponent: 'Boston Red Sox',
    defaultMinute: 'Bottom 9th',
    opponentLabel: 'Opponent / Rival',
    opponentPlaceholder: 'e.g. Boston Red Sox, World Series Game 7',
    minuteLabel: 'Inning & Count',
    minutePlaceholder: 'e.g. Bottom 9th 2-Out Full Count, Extra Innings',
    momentPlaceholder: 'e.g. Walk-off grand slam blast into deep right field upper deck',
    defaultQuote: 'Bottom 9th Walk-Off Grand Slam - World Series Winner',
  },
  {
    id: 'ice_hockey',
    name: 'Ice Hockey',
    teamLabel: 'Hockey Franchise',
    presetClubs: [
      'Montreal Canadiens',
      'Toronto Maple Leafs',
      'New York Rangers',
      'Boston Bruins',
      'Edmonton Oilers',
      'Chicago Blackhawks',
      'Detroit Red Wings',
    ],
    defaultTeam: 'Montreal Canadiens',
    defaultOpponent: 'Boston Bruins',
    defaultMinute: 'OT 14:22',
    opponentLabel: 'Opponent / Original Six Rival',
    opponentPlaceholder: 'e.g. Boston Bruins, Stanley Cup Finals',
    minuteLabel: 'Period & Game Clock',
    minutePlaceholder: 'e.g. Period 3 19:42, Overtime Sudden Death',
    momentPlaceholder: 'e.g. Sudden-death overtime top-shelf one-timer to lift the cup',
    defaultQuote: 'Sudden Death Overtime Winner - Stanley Cup Triumph',
  },
  {
    id: 'golf_athletics',
    name: 'Golf & Athletics',
    teamLabel: 'Tournament / Federation',
    presetClubs: [
      'The Masters Tournament (Augusta)',
      'The Open Championship (St Andrews)',
      'Ryder Cup Team Europe',
      'Ryder Cup Team USA',
      'Olympic Track & Field Final',
      'PGA Tour Championship',
    ],
    defaultTeam: 'The Masters Tournament (Augusta)',
    defaultOpponent: 'Augusta National 18th Hole',
    defaultMinute: 'Round 4 Hole 18',
    opponentLabel: 'Tournament / Decider Round',
    opponentPlaceholder: 'e.g. Augusta National 18th Hole, Ryder Cup Sunday',
    minuteLabel: 'Hole / Round / Final Heat',
    minutePlaceholder: 'e.g. 18th Hole Sunday, 100m Olympic Final 9.58s',
    momentPlaceholder: 'e.g. 25-foot chip-in birdie from fringe to clinch the Green Jacket',
    defaultQuote: 'Sunday 18th Hole Birdie - Historic Green Jacket Win',
  },
];

const CharityAllocationCallout: React.FC = () => (
  <div
    style={{
      marginTop: '1.25rem',
      padding: '0.85rem 1rem',
      borderRadius: '10px',
      backgroundColor: '#0d121c',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      boxSizing: 'border-box',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>
        Registered Charity or Trust?
      </div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
        Apply for 15% statutory checkout allocation
      </div>
    </div>
    <Link
      to="/charities/apply"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.45rem 0.75rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#ffffff',
        backgroundColor: '#111726',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '6px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      Apply <span aria-hidden="true">→</span>
    </Link>
  </div>
);

const PartnerNetworkCallout: React.FC = () => (
  <div
    style={{
      marginTop: '0.75rem',
      padding: '0.85rem 1rem',
      borderRadius: '10px',
      backgroundColor: '#0d121c',
      border: '1px solid rgba(255, 45, 141, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      boxSizing: 'border-box',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>
        Fulfillment Studio or NGO?
      </div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
        Join local production guild or apply for grants
      </div>
    </div>
    <Link
      to="/partners"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.45rem 0.75rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#ffffff',
        backgroundColor: '#ff2d8d',
        border: 'none',
        borderRadius: '6px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      Partner <span aria-hidden="true">→</span>
    </Link>
  </div>
);

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
  const [frenzyQuote, setFrenzyQuote] = useState<string>('89th Minute Winning Strike - North Bank Heritage');
  const [garmentModel, setGarmentModel] = useState<string>('HEAVYWEIGHT_HOODIE');
  const [threadColor, setThreadColor] = useState<string>('SIGNATURE_MAGENTA');
  const [placement, setPlacement] = useState<string>('LEFT_CHEST');
  const [frenzyQuantity, setFrenzyQuantity] = useState<number>(1);

  // Multi-Sport Discipline State
  const [selectedSportId, setSelectedSportId] = useState<string>('football');
  const activeSport = MAJOR_SPORTS.find((s) => s.id === selectedSportId) || MAJOR_SPORTS[0];

  const handleSportChange = (sportId: string) => {
    setSelectedSportId(sportId);
    const targetSport = MAJOR_SPORTS.find((s) => s.id === sportId) || MAJOR_SPORTS[0];
    setFrenzyClub(targetSport.defaultTeam);
    setCustomClub('');
    setFrenzyOpponent(targetSport.defaultOpponent);
    setFrenzyMinute(targetSport.defaultMinute);
    setFrenzyMoment(targetSport.momentPlaceholder);
    setFrenzyQuote(targetSport.defaultQuote);
  };

  // Checkout State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // "Contact for Order" enquiry state (for non-priced items)
  const [enquiryName, setEnquiryName] = useState<string>('');
  const [enquiryEmail, setEnquiryEmail] = useState<string>('');
  const [enquiryMessage, setEnquiryMessage] = useState<string>('');
  const [enquiryLoading, setEnquiryLoading] = useState<boolean>(false);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

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

  // Standard Catalog Stripe Hosted Checkout (cap only - priceCents must be non-null)
  const handleCatalogStripeHostedCheckout = async () => {
    if (selectedItem.priceCents === null) {
      setError('This item is not yet available for direct purchase. Please use the Contact for Order form.');
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

  // "Contact for Order" enquiry submission for non-priced items
  const handleEnquirySubmit = async () => {
    if (!enquiryName.trim() || !enquiryEmail.trim()) {
      setEnquiryError('Your name and email address are required.');
      return;
    }
    setEnquiryLoading(true);
    setEnquiryError(null);
    setEnquirySuccess(null);
    try {
      await api.submitMerchEnquiry({
        itemId: selectedItem.id,
        itemTitle: selectedItem.title,
        contactName: enquiryName.trim(),
        contactEmail: enquiryEmail.trim(),
        message: enquiryMessage.trim() || undefined,
      });
      setEnquirySuccess('Enquiry received. Our team will be in touch within 1 to 2 business days.');
      setEnquiryName('');
      setEnquiryEmail('');
      setEnquiryMessage('');
    } catch (err: any) {
      setEnquiryError(err.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setEnquiryLoading(false);
    }
  };

  // Goal Frenzy Studio Stripe Hosted Checkout
  const handleGoalFrenzyCheckout = async () => {
    if (!activeClubName) {
      setError(`Please select or specify your ${activeSport.teamLabel.toLowerCase()}.`);
      return;
    }
    const quoteText = frenzyQuote.trim() || `${activeClubName} ${frenzyMoment} (${frenzyMinute})`;
    if (quoteText.length > 80) {
      setError('Embroidery quote must be 80 characters or fewer.');
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

      if (res?.sessionUrl) {
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
    <div style={{ backgroundColor: 'var(--cerebrium-obsidian, #08040c)', minHeight: '100vh', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      {/* Background ambient neon glow matching portal/login */}
      <div className="book-demo-ambient-glow" aria-hidden="true" />

      {/* Clean Breadcrumb Bar */}
      <div
        className="container-x frame-bordered"
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: '#94a3b8',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
          GHGEmissionLogs
        </Link>
        <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
        <span style={{ color: '#ffffff', fontWeight: 600 }}>Support Extreme Weather</span>
      </div>

      <div className="container-x frame-bordered" style={{ maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 1.5rem 5rem 1.5rem', position: 'relative', zIndex: 1 }}>
        
        {/* Header matching portal/login typography & colors */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              color: '#ff2d8d',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Extreme Weather Relief
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3rem)',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 0.85rem 0',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            Support Extreme Weather
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#94a3b8',
              lineHeight: 1.65,
              maxWidth: '820px',
              margin: 0,
            }}
          >
            Bespoke apparel and extreme weather support. Unit prices are determined by supplier base production specifications, with an immediate contractual 85% supplier fulfillment / 15% statutory charity split at checkout.
          </p>

          {/* Segmented Tab Switcher matching portal/login */}
          <div
            role="tablist"
            aria-label="Merchandise navigation"
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0d121c',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '10px',
              padding: '4px',
              marginTop: '1.75rem',
              width: '100%',
              maxWidth: '480px',
              gap: '4px',
              boxSizing: 'border-box',
            }}
          >
            <button
              role="tab"
              aria-selected={activeTab === 'catalog'}
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                setSuccessResult(null);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'catalog' ? 700 : 500,
                cursor: 'pointer',
                border: activeTab === 'catalog' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                backgroundColor: activeTab === 'catalog' ? '#111726' : 'transparent',
                color: activeTab === 'catalog' ? '#ffffff' : '#94a3b8',
                boxShadow: activeTab === 'catalog' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : 'none',
                transition: 'all 0.15s ease',
                minHeight: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              Official Apparel Catalog
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'goal_frenzy'}
              type="button"
              onClick={() => {
                setActiveTab('goal_frenzy');
                setSuccessResult(null);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'goal_frenzy' ? 700 : 500,
                cursor: 'pointer',
                border: activeTab === 'goal_frenzy' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                backgroundColor: activeTab === 'goal_frenzy' ? '#111726' : 'transparent',
                color: activeTab === 'goal_frenzy' ? '#ffffff' : '#94a3b8',
                boxShadow: activeTab === 'goal_frenzy' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : 'none',
                transition: 'all 0.15s ease',
                minHeight: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              Frenzy Custom Studio
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* TAB 1: OFFICIAL MERCH CATALOG */}
        {activeTab === 'catalog' && (
          <>
            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.5rem 1.15rem',
                    borderRadius: '9999px',
                    fontSize: '0.825rem',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    cursor: 'pointer',
                    border: selectedCategory === cat ? '1px solid #ff2d8d' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: selectedCategory === cat ? '#ff2d8d' : '#0d121c',
                    color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                    boxShadow: selectedCategory === cat ? '0 4px 14px rgba(255, 45, 141, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
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
                backgroundColor: 'rgba(8, 4, 12, 0.94)',
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
                  backgroundColor: '#111726',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ position: 'relative', height: 'min(480px, 50vh)', backgroundColor: '#0d121c' }}>
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
                      background: 'rgba(13, 18, 28, 0.85)',
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
                <div style={{ padding: '1.5rem', backgroundColor: '#111726' }}>
                  <div style={{ fontSize: '0.75rem', color: '#ff2d8d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {lightboxImage.category}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0.25rem 0' }}>{lightboxImage.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{lightboxImage.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Responsive Store Layout */}
          <div className="store-layout-grid">
            
            {/* Left Column: Product Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#111726',
                    border: selectedItem.id === item.id ? '2px solid #ff2d8d' : '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: '16px',
                    boxShadow: selectedItem.id === item.id ? '0 15px 35px rgba(255, 45, 141, 0.25)' : '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedItem.id !== item.id) {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 20px 45px -10px rgba(0, 0, 0, 0.85)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedItem.id !== item.id) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(0, 0, 0, 0.7)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                    }
                  }}
                >
                  <div
                    style={{ position: 'relative', height: '240px', backgroundColor: '#0d121c', cursor: 'pointer', overflow: 'hidden' }}
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
                        background: 'rgba(13, 18, 28, 0.85)',
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
                        background: 'rgba(13, 18, 28, 0.75)',
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
                      <div style={{ fontSize: '0.72rem', color: '#ff2d8d', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        {item.category}
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0.35rem 0', letterSpacing: '-0.01em' }}>{item.title}</h3>
                      <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    </div>

                    {/* Price / Contact badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {item.priceCents !== null ? (
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          £{(item.priceCents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ff2d8d', backgroundColor: 'rgba(255, 45, 141, 0.12)', border: '1px solid rgba(255, 45, 141, 0.35)', padding: '3px 9px', borderRadius: '20px' }}>
                          Contact for Order
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setSuccessResult(null);
                          setEnquirySuccess(null);
                          setEnquiryError(null);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: selectedItem.id === item.id ? 700 : 600,
                          minHeight: '40px',
                          flex: '1 1 auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          backgroundColor: selectedItem.id === item.id ? '#ff2d8d' : '#0d121c',
                          color: '#ffffff',
                          border: selectedItem.id === item.id ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: selectedItem.id === item.id ? '0 4px 14px rgba(255, 45, 141, 0.45)' : 'none',
                        }}
                      >
                        {selectedItem.id === item.id ? 'Selected' : 'Select Item'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Checkout Panel */}
            <div
              style={{
                backgroundColor: '#111726',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '16px',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7)',
                padding: '1.75rem',
                position: 'sticky',
                top: '100px',
              }}
            >
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.09)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
                  Order &amp; ESG Routing
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Complete purchase with automated 15% charity split
                </p>
              </div>

              {successResult ? (
                <div>
                  <div style={{ backgroundColor: 'rgba(255, 45, 141, 0.1)', border: '1px solid #ff2d8d', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>Order Placed & Payment Settled</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Transaction: <code style={{ color: '#ffffff', backgroundColor: '#0d121c', padding: '2px 6px', borderRadius: '4px' }}>{successResult.transactionId}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</span>
                    <StatusBadge status="SETTLED" />
                  </div>

                  <div style={{ margin: '1rem 0' }}>
                    <OpenSeaBadge transactionId={successResult.transactionId} licenseeId={selectedItem.licenseeId} />
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.09)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <FinancialSplitBar
                      grossAmountCents={successResult.grossAmountCents}
                      licensorRoyaltyCents={successResult.licensorRoyaltyCents}
                      charityGiftCents={successResult.charityGiftCents}
                      dark={true}
                    />
                  </div>

                  <button
                    onClick={() => setSuccessResult(null)}
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      marginTop: '1.25rem',
                      backgroundColor: '#0d121c',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Purchase Another Item
                  </button>
                </div>
              ) : selectedItem.priceCents !== null ? (
                /* PRICED ITEM: CAP AT £35.00 */
                <div>
                  <div style={{ padding: '1rem', backgroundColor: '#0d121c', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>{selectedItem.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{selectedItem.partnerName}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                      £{(selectedItem.priceCents / 100).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0d121c', border: '1px solid rgba(255, 255, 255, 0.09)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#ff2d8d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      Compulsory Statutory Routing
                    </div>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>Verified GHG Accountability Mark</div>
                    <div style={{ color: '#94a3b8', marginTop: '0.25rem', lineHeight: 1.4, fontSize: '0.8rem' }}>
                      Exact 15% of purchase is automatically routed to verified local environmental restoration and extreme weather relief funds.
                    </div>
                  </div>

                  {/* Single Payment Option: Stripe Hosted Checkout */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Payment Method
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                        256-Bit SSL Encrypted
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCatalogStripeHostedCheckout}
                      disabled={loading}
                      style={{
                        width: '100%',
                        minHeight: '48px',
                        padding: '0.85rem 1.25rem',
                        backgroundColor: loading ? '#222938' : '#ff2d8d',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s ease, opacity 0.2s ease',
                        boxShadow: loading ? 'none' : '0 8px 24px rgba(255, 45, 141, 0.45)',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = '#e02379';
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = '#ff2d8d';
                      }}
                    >
                      <span>{loading ? 'Connecting to Stripe...' : `Pay £${(selectedItem.priceCents / 100).toFixed(2)} with Stripe Checkout`}</span>
                    </button>

                    <div style={{ marginTop: '0.65rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      256-Bit SSL Encrypted via Stripe Checkout. Supports Credit/Debit Cards, Apple Pay, and Google Pay.
                    </div>
                  </div>

                  {/* Statutory Non-Profit Application Link */}
                  <CharityAllocationCallout />
                  <PartnerNetworkCallout />
                </div>
              ) : (
                /* UNPRICED ITEM: CONTACT ON ORDER */
                <div>
                  <div style={{ padding: '1rem', backgroundColor: '#0d121c', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>{selectedItem.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{selectedItem.partnerName}</div>
                    <div style={{ marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', backgroundColor: 'rgba(255, 45, 141, 0.12)', border: '1px solid rgba(255, 45, 141, 0.3)', borderRadius: '20px', color: '#ff2d8d', fontWeight: 700, fontSize: '0.85rem' }}>
                      <span>Price on Request • Contact on Order</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Submit your contact details below to register an order enquiry
                  </p>

                  {enquirySuccess ? (
                    <div style={{ backgroundColor: 'rgba(255, 45, 141, 0.1)', border: '1px solid #ff2d8d', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                        Inquiry Registered Successfully
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
                        {enquirySuccess}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEnquirySuccess(null);
                          setEnquiryError(null);
                        }}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          fontSize: '0.85rem',
                          backgroundColor: '#0d121c',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Submit Another Inquiry
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleEnquirySubmit();
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                      {enquiryError && (
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {enquiryError}
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem' }}>
                          Your Name <span style={{ color: '#ff2d8d' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={enquiryName}
                          onChange={(e) => setEnquiryName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            minHeight: '48px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: '#0d121c',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem' }}>
                          Contact Email <span style={{ color: '#ff2d8d' }}>*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={enquiryEmail}
                          onChange={(e) => setEnquiryEmail(e.target.value)}
                          placeholder="name@company.com"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            minHeight: '48px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: '#0d121c',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem' }}>
                          Order Notes / Quantity / Sizing <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          value={enquiryMessage}
                          onChange={(e) => setEnquiryMessage(e.target.value)}
                          placeholder="Specify desired quantity, sizes (e.g. L, XL), or delivery requirements..."
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: '#0d121c',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={enquiryLoading}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          padding: '0.85rem 1.25rem',
                          backgroundColor: enquiryLoading ? '#222938' : '#ff2d8d',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: enquiryLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          transition: 'background-color 0.2s ease, opacity 0.2s ease',
                          boxShadow: enquiryLoading ? 'none' : '0 8px 24px rgba(255, 45, 141, 0.45)',
                        }}
                        onMouseEnter={(e) => {
                          if (!enquiryLoading) e.currentTarget.style.backgroundColor = '#e02379';
                        }}
                        onMouseLeave={(e) => {
                          if (!enquiryLoading) e.currentTarget.style.backgroundColor = '#ff2d8d';
                        }}
                      >
                        {enquiryLoading ? 'Submitting Inquiry...' : 'Contact on Order'}
                      </button>
                    </form>
                  )}

                  <CharityAllocationCallout />
                  <PartnerNetworkCallout />
                </div>
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
              backgroundColor: '#111726',
              borderRadius: '16px',
              padding: '1.75rem 2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                color: '#ff2d8d',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '0.35rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Custom Commemorations
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Sports Milestone Commemoration Studio
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#94a3b8', maxWidth: '780px', lineHeight: 1.6, margin: 0 }}>
              Configure bespoke commemorative club apparel celebrating milestone matches and defining moments. Every garment is crafted from certified organic textiles with automated 15% statutory ESG charitable routing.
            </p>
          </div>

          {/* Goal Frenzy Studio Layout Grid */}
          <div className="store-layout-grid">
            
            {/* Left Column: Interactive Moment Configurator */}
            <div>
              {/* Card 1: Sports Moment Definition */}
              <div
                style={{
                  backgroundColor: '#111726',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: '16px',
                  boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7)',
                  padding: '1.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0' }}>
                  1. Match &amp; moment details
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                  Select your sport discipline, team, opponent, and decisive moment or clock.
                </p>

                {/* Sport Discipline Dropdown */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="sport-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    Sport Discipline
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="sport-select"
                      value={selectedSportId}
                      onChange={(e) => handleSportChange(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      {MAJOR_SPORTS.map((sport) => (
                        <option key={sport.id} value={sport.id} style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ff2d8d', fontSize: '0.75rem' }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Team / Club Selector Dropdown */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="club-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    Select {activeSport.teamLabel}
                  </label>
                  <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
                    <select
                      id="club-select"
                      value={customClub ? '__custom__' : (frenzyClub || '')}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setFrenzyClub('');
                          setCustomClub(' ');
                        } else {
                          setFrenzyClub(e.target.value);
                          setCustomClub('');
                        }
                      }}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="" style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>-- Choose {activeSport.teamLabel.toLowerCase()} --</option>
                      {activeSport.presetClubs.map((c) => (
                        <option key={c} value={c} style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>{c}</option>
                      ))}
                      <option value="__custom__" style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>Other / Custom {activeSport.teamLabel.toLowerCase()}...</option>
                    </select>
                    <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ff2d8d', fontSize: '0.75rem' }}>
                      ▼
                    </span>
                  </div>
                  {/* Reveal text input only when "Other" is chosen */}
                  {customClub !== '' && (
                    <input
                      type="text"
                      placeholder={`Enter ${activeSport.teamLabel.toLowerCase()} name`}
                      value={customClub.trim() === '' ? '' : customClub}
                      onChange={(e) => {
                        setCustomClub(e.target.value);
                        setFrenzyClub(e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                      autoFocus
                    />
                  )}
                </div>

                {/* Opponent & Minute */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.35rem' }}>
                      {activeSport.opponentLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={activeSport.opponentPlaceholder}
                      value={frenzyOpponent}
                      onChange={(e) => setFrenzyOpponent(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.35rem' }}>
                      {activeSport.minuteLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={activeSport.minutePlaceholder}
                      value={frenzyMinute}
                      onChange={(e) => setFrenzyMinute(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Moment Description */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.35rem' }}>
                    Defining Moment Narrative
                  </label>
                  <input
                    type="text"
                    placeholder={activeSport.momentPlaceholder}
                    value={frenzyMoment}
                    onChange={(e) => setFrenzyMoment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: '#0d121c',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Inscription Quote */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
                      Embroidered Fan Inscription (Max 80 chars)
                    </label>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: frenzyQuote.length > 80 ? '#fca5a5' : '#94a3b8' }}>
                      {frenzyQuote.length}/80
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Absolute limbs in the North Bank! We never gave up."
                    value={frenzyQuote}
                    onChange={(e) => setFrenzyQuote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: '#0d121c',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Card 2: Garment Model & Specs */}
              <div
                style={{
                  backgroundColor: '#111726',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: '16px',
                  boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7)',
                  padding: '1.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0' }}>
                  2. Eco-Garment &amp; Embroidery Specs
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                  Select silhouette, organic thread color, and embroidery placement.
                </p>

                {/* Garment Silhouette Dropdown */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="garment-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    Garment Silhouette
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="garment-select"
                      value={garmentModel}
                      onChange={(e) => setGarmentModel(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      {GARMENT_OPTIONS.map((g) => (
                        <option key={g.id} value={g.id} style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>
                          {g.label} - £{(g.priceCents / 100).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ff2d8d', fontSize: '0.75rem' }}>
                      ▼
                    </span>
                  </div>
                  {/* Selected summary chip */}
                  {(() => {
                    const g = GARMENT_OPTIONS.find((x) => x.id === garmentModel);
                    return g ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255, 45, 141, 0.15)', color: '#ff2d8d', border: '1px solid rgba(255, 45, 141, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                          £{(g.priceCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Thread Color Dropdown */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="thread-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    3D Embroidery Thread Color
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="thread-select"
                      value={threadColor}
                      onChange={(e) => setThreadColor(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      {THREAD_COLORS.map((t) => (
                        <option key={t.id} value={t.id} style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ff2d8d', fontSize: '0.75rem' }}>
                      ▼
                    </span>
                  </div>
                  {/* Color swatch preview */}
                  {(() => {
                    const t = THREAD_COLORS.find((x) => x.id === threadColor);
                    return t ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: t.hex, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0, boxShadow: `0 0 6px ${t.hex}66` }} />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{t.label} selected</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Embroidery Placement Dropdown */}
                <div>
                  <label htmlFor="placement-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                    Embroidery Placement
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="placement-select"
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#0d121c',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      {PLACEMENT_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id} style={{ backgroundColor: '#0d121c', color: '#ffffff' }}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ff2d8d', fontSize: '0.75rem' }}>
                      ▼
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Goal Frenzy Checkout Panel */}
            <div
              style={{
                backgroundColor: '#111726',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '16px',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7)',
                padding: '1.75rem',
                position: 'sticky',
                top: '100px',
              }}
            >
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.09)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#ff2d8d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Frenzy Custom Studio Milestone Order
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0.2rem 0 0.25rem 0' }}>
                  Bespoke Commemoration
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Custom embroidery with verified 15% ESG charitable routing
                </p>
              </div>

              {successResult ? (
                <div>
                  <div style={{ backgroundColor: 'rgba(255, 45, 141, 0.1)', border: '1px solid #ff2d8d', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>Frenzy Custom Order Initiated!</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Transaction: <code style={{ color: '#ffffff', backgroundColor: '#0d121c', padding: '2px 6px', borderRadius: '4px' }}>{successResult.transactionId}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</span>
                    <StatusBadge status="SETTLED" />
                  </div>

                  <div style={{ margin: '1rem 0' }}>
                    <OpenSeaBadge transactionId={successResult.transactionId} licenseeId="lic_ghg_official" />
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.09)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <FinancialSplitBar
                      grossAmountCents={successResult.grossAmountCents}
                      licensorRoyaltyCents={successResult.licensorRoyaltyCents}
                      charityGiftCents={successResult.charityGiftCents}
                      dark={true}
                    />
                  </div>

                  <button
                    onClick={() => setSuccessResult(null)}
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      marginTop: '1.25rem',
                      backgroundColor: '#0d121c',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Customize Another Milestone
                  </button>
                </div>
              ) : (
                <div>
                  {/* Order Summary Box */}
                  <div style={{ padding: '1rem', backgroundColor: '#0d121c', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                      {activeClubName} - {activeGarment.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                      Thread: {activeThread.label} • Placement: {placement}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Quantity:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setFrenzyQuantity(Math.max(1, frenzyQuantity - 1))}
                          style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.12)', background: '#111726', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#ffffff' }}>{frenzyQuantity}</span>
                        <button
                          type="button"
                          onClick={() => setFrenzyQuantity(frenzyQuantity + 1)}
                          style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.12)', background: '#111726', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginTop: '0.75rem', fontFamily: 'monospace' }}>
                      £{(frenzyGrossCents / 100).toFixed(2)}
                    </div>
                  </div>

                  {/* 85/15 Financial Split Preview */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                      Financial Routing (85/15 Mandate)
                    </div>
                    <FinancialSplitBar
                      grossAmountCents={frenzyGrossCents}
                      licensorRoyaltyCents={frenzyLicensorCents}
                      charityGiftCents={frenzyCharityCents}
                      dark={true}
                    />
                  </div>

                  {/* Compulsory Statutory Routing */}
                  <div style={{ backgroundColor: '#0d121c', border: '1px solid rgba(255, 255, 255, 0.09)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#ff2d8d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      Compulsory Statutory Routing
                    </div>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>Verified GHG Accountability Mark</div>
                    <div style={{ color: '#94a3b8', marginTop: '0.25rem', lineHeight: 1.4, fontSize: '0.8rem' }}>
                      Exact £{(frenzyCharityCents / 100).toFixed(2)} (15%) automatically routed to verified community and reforestation partners.
                    </div>
                  </div>

                  {/* Single Payment Option: Stripe Hosted Checkout */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Payment Method
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                        256-Bit SSL Encrypted
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoalFrenzyCheckout}
                      disabled={loading}
                      style={{
                        width: '100%',
                        minHeight: '48px',
                        padding: '0.85rem 1.25rem',
                        backgroundColor: loading ? '#222938' : '#ff2d8d',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s ease, opacity 0.2s ease',
                        boxShadow: loading ? 'none' : '0 8px 24px rgba(255, 45, 141, 0.45)',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = '#e02379';
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = '#ff2d8d';
                      }}
                    >
                      <span>{loading ? 'Connecting to Stripe...' : `Pay £${(frenzyGrossCents / 100).toFixed(2)} with Stripe Checkout`}</span>
                    </button>

                    <div style={{ marginTop: '0.65rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      256-Bit SSL Encrypted via Stripe Checkout. Supports Credit/Debit Cards, Apple Pay, and Google Pay.
                    </div>
                  </div>

                  {/* Statutory Non-Profit Application Link */}
                  <CharityAllocationCallout />
                  <PartnerNetworkCallout />
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  );
};
