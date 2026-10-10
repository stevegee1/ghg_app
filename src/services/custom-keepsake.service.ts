import { PrismaClient, TransactionStatus } from '@prisma/client';

export interface KeepsakePreviewInput {
  inscribedText: string;
  threadColor: string;
  placement: string;
  quantity?: number;
}

/** The garment as priced in the merch catalogue (merch-catalogue.service.ts). */
export interface KeepsakeGarment {
  id: string;
  pricePence: number;
  lcaGrams: number | null;
  laborHours: number | null;
}

export interface RecordKeepsakeSpecInput {
  transactionId: string;
  garmentModel: string;
  inscribedText: string;
  threadColor: string;
  placement: string;
  artisanLaborHours?: number;
  lcaCarbonGrams?: number;
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
   * Generates a preview specification: canvas placement, ISO 14067 LCA carbon grams, artisan labour
   * hours and the price split. The unit price comes from the catalogue and the charity share from the
   * active split configuration (royaltyBps), never from the request.
   */
  generateKeepsakePreview(input: KeepsakePreviewInput, garment: KeepsakeGarment, royaltyBps: number) {
    const { inscribedText, threadColor, placement, quantity = 1 } = input;
    const garmentModel = garment.id;

    if (!inscribedText || !inscribedText.trim()) {
      throw new Error('Invalid input: inscribedText is required for custom milestone embroidery.');
    }

    if (inscribedText.length > 80) {
      throw new Error('Invalid input: inscribedText exceeds 80 characters maximum.');
    }

    const unitPriceCents = garment.pricePence;
    const baseLcaGrams = garment.lcaGrams ?? 0;
    const baseLaborHours = garment.laborHours ?? 0;

    const totalGrossCents = unitPriceCents * quantity;
    const licensorRoyaltyCents = Math.round((totalGrossCents * royaltyBps) / 10000);
    const charityGiftCents = totalGrossCents - licensorRoyaltyCents;

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
        charityPercentage: (10000 - royaltyBps) / 100,
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
