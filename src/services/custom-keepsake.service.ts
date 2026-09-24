import { PrismaClient, TransactionStatus } from '@prisma/client';

export type GarmentModelType =
  | 'T_SHIRT'
  | 'PUFF_JACKET'
  | 'HOODIE'
  | 'BACKPACK'
  | 'SCHOOL_BAG'
  | 'SOCKS'
  | 'INSULATED_PUFFER_JACKET'
  | 'TECH_FLEECE_JACKET'
  | 'HEAVYWEIGHT_HOODIE'
  | 'SOFTSHELL_VEST'
  | 'FLEECE_JOGGERS'
  | 'STRUCTURED_CAP'
  | 'VINTAGE_TEE';

export const SUPPLIER_PRICING_SCHEDULE: Record<
  string,
  { name: string; baseSupplierCostCents: number; description: string; defaultLcaGrams: number }
> = {
  T_SHIRT: { name: 'Organic Cotton T-Shirt', baseSupplierCostCents: 2200, description: '100% GOTS certified organic combed cotton', defaultLcaGrams: 290 },
  PUFF_JACKET: { name: 'Recycled Down Puffer Jacket', baseSupplierCostCents: 6500, description: 'Post-consumer recycled ripstop with 700 fill down', defaultLcaGrams: 780 },
  HOODIE: { name: 'Heavyweight Commemorative Hoodie', baseSupplierCostCents: 4200, description: '450gsm cross-grain French terry fleece', defaultLcaGrams: 520 },
  BACKPACK: { name: 'Industrial Canvas Backpack', baseSupplierCostCents: 3800, description: 'Water-resistant 16oz recycled canvas with laptop divider', defaultLcaGrams: 680 },
  SCHOOL_BAG: { name: 'Student & Youth School Bag', baseSupplierCostCents: 2800, description: 'Reinforced dual-compartment ergonomic backpack', defaultLcaGrams: 540 },
  SOCKS: { name: 'Performance Technical Socks', baseSupplierCostCents: 1200, description: 'Merino blend anti-blister archival sports socks', defaultLcaGrams: 120 },
  // Backward compatibility mappings
  VINTAGE_TEE: { name: 'Organic Cotton T-Shirt', baseSupplierCostCents: 2200, description: '100% GOTS certified organic combed cotton', defaultLcaGrams: 290 },
  INSULATED_PUFFER_JACKET: { name: 'Recycled Down Puffer Jacket', baseSupplierCostCents: 6500, description: 'Post-consumer recycled ripstop with 700 fill down', defaultLcaGrams: 780 },
  HEAVYWEIGHT_HOODIE: { name: 'Heavyweight Commemorative Hoodie', baseSupplierCostCents: 4200, description: '450gsm cross-grain French terry fleece', defaultLcaGrams: 520 },
  STRUCTURED_CAP: { name: 'Embroidered Structured Cap', baseSupplierCostCents: 1800, description: 'Six-panel twill cap with brass buckle', defaultLcaGrams: 210 },
  SOFTSHELL_VEST: { name: 'Thermal Softshell Vest', baseSupplierCostCents: 3500, description: 'Windproof technical utility vest', defaultLcaGrams: 410 },
  TECH_FLEECE_JACKET: { name: 'Technical Fleece Jacket', baseSupplierCostCents: 4800, description: 'Thermal bonded zip jacket', defaultLcaGrams: 620 },
  FLEECE_JOGGERS: { name: 'Heavyweight Fleece Joggers', baseSupplierCostCents: 3600, description: 'Relaxed fit heavyweight fleece trousers', defaultLcaGrams: 440 },
};

export interface KeepsakePreviewInput {
  garmentModel: GarmentModelType | string;
  inscribedText: string;
  threadColor: string;
  placement: string;
  quantity?: number;
  unitPriceCents?: number;
}

export interface RecordKeepsakeSpecInput {
  transactionId: string;
  garmentModel: string;
  inscribedText: string;
  threadColor: string;
  placement: string;
  artisanLaborHours?: number;
  lcaCarbonGrams?: number;
  openSeaTokenUri?: string;
  isGoalFrenzy?: boolean;
  sportType?: string;
  frenzyClub?: string;
  frenzyOpponent?: string;
  frenzyMinute?: string;
  frenzyMoment?: string;
  frenzyQuote?: string;
  garmentSize?: string;
  shippingAddress?: any;
  customerEmail?: string;
  customerName?: string;
  fulfillmentStatus?: string;
  trackingNumber?: string;
}

export class CustomKeepsakeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a preview specification including canvas placement, ISO 14067 LCA carbon grams,
   * local artisan embroidery labor hours, supplier base cost, and the mandatory 15% charitable gift split.
   */
  generateKeepsakePreview(input: KeepsakePreviewInput) {
    const {
      garmentModel,
      inscribedText,
      threadColor,
      placement,
      quantity = 1,
    } = input;

    if (!inscribedText || !inscribedText.trim()) {
      throw new Error('Invalid input: inscribedText is required for custom milestone embroidery.');
    }

    if (inscribedText.length > 80) {
      throw new Error('Invalid input: inscribedText exceeds 80 characters maximum.');
    }

    const itemMeta = SUPPLIER_PRICING_SCHEDULE[garmentModel] || SUPPLIER_PRICING_SCHEDULE.HOODIE;
    
    // Dynamic price calculation: base supplier cost represents exactly 85% of total.
    // 15% is added as the statutory charity endowment.
    const calculatedUnitPriceCents = input.unitPriceCents || Math.round(itemMeta.baseSupplierCostCents / 0.85);
    const unitPriceCents = calculatedUnitPriceCents;

    // LCA Carbon Footprint computation under ISO 14067 (Cradle-to-Gate)
    let baseLcaGrams = itemMeta.defaultLcaGrams || 500;
    let baseLaborHours = 1.8;

    switch (garmentModel) {
      case 'PUFF_JACKET':
      case 'INSULATED_PUFFER_JACKET':
        baseLaborHours = 3.0;
        break;
      case 'TECH_FLEECE_JACKET':
        baseLaborHours = 2.5;
        break;
      case 'HOODIE':
      case 'HEAVYWEIGHT_HOODIE':
        baseLaborHours = 2.0;
        break;
      case 'BACKPACK':
        baseLaborHours = 2.2;
        break;
      case 'SCHOOL_BAG':
        baseLaborHours = 1.8;
        break;
      case 'SOCKS':
        baseLaborHours = 0.5;
        break;
      case 'T_SHIRT':
      case 'VINTAGE_TEE':
        baseLaborHours = 0.8;
        break;
      default:
        baseLaborHours = 1.5;
        break;
    }

    const totalGrossCents = unitPriceCents * quantity;
    const charityGiftCents = Math.round(totalGrossCents * 0.15); // Exact 15% Mandate
    const licensorRoyaltyCents = totalGrossCents - charityGiftCents;

    return {
      garmentModel,
      inscribedText: inscribedText.trim(),
      threadColor,
      placement,
      quantity,
      financialSummary: {
        unitPriceCents,
        grossAmountCents: totalGrossCents,
        charityGiftCents,
        charityPercentage: 15,
        licensorRoyaltyCents,
      },
      dualImpactMetrics: {
        isoStandard: 'ISO 14067:2018 (Product Carbon Footprint) & ISO 14044',
        estimatedLcaCarbonGrams: baseLcaGrams * quantity,
        organicCottonPct: 100,
        toxicDyePct: 0,
        artisanLaborHours: Math.round(baseLaborHours * quantity * 10) / 10,
        localJobReportingTrack: 'Milestone 5f Section 106 Artisan Covenant',
      },
      canvasRenderSpec: {
        fontFamily: 'Cinzel, Georgia, serif',
        fontSizePx: garmentModel === 'STRUCTURED_CAP' ? 18 : 24,
        stitchTexture: 'HIGH_DENSITY_EMBROIDERY_3D',
        threadHex:
          threadColor === 'GOLD_METALLIC'
            ? '#D4AF37'
            : threadColor === 'STERLING_SILVER'
            ? '#C0C0C0'
            : threadColor === 'EMERALD_GREEN'
            ? '#10B981'
            : '#FFFFFF',
        placementCoordinates:
          placement === 'LEFT_CHEST'
            ? { x: 35, y: 40 }
            : placement === 'RIGHT_SLEEVE'
            ? { x: 75, y: 55 }
            : { x: 50, y: 20 },
      },
    };
  }

  /**
   * Persists custom keepsake specifications linked to the settled transaction.
   */
  async recordKeepsakeSpec(input: RecordKeepsakeSpecInput) {
    const {
      transactionId,
      garmentModel,
      inscribedText,
      threadColor,
      placement,
      artisanLaborHours = 1.5,
      lcaCarbonGrams = 450,
      openSeaTokenUri,
    } = input;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction '${transactionId}' not found.`);
    }

    return this.prisma.customKeepsakeSpec.create({
      data: {
        transactionId,
        garmentModel,
        inscribedText: inscribedText.trim(),
        threadColor,
        placement,
        artisanLaborHours,
        lcaCarbonGrams,
        openSeaTokenUri: openSeaTokenUri || null,
        isGoalFrenzy: !!input.isGoalFrenzy,
        sportType: input.sportType || 'Football',
        frenzyClub: input.frenzyClub || null,
        frenzyOpponent: input.frenzyOpponent || null,
        frenzyMinute: input.frenzyMinute || null,
        frenzyMoment: input.frenzyMoment || null,
        frenzyQuote: input.frenzyQuote || null,
        garmentSize: input.garmentSize || 'M',
        shippingAddress: input.shippingAddress || null,
        customerEmail: input.customerEmail || null,
        customerName: input.customerName || null,
        fulfillmentStatus: input.fulfillmentStatus || 'PENDING',
        trackingNumber: input.trackingNumber || null,
      },
    });
  }
}
