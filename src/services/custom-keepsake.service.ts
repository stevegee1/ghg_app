import { PrismaClient, TransactionStatus } from '@prisma/client';

export interface KeepsakePreviewInput {
  garmentModel:
    | 'INSULATED_PUFFER_JACKET'
    | 'TECH_FLEECE_JACKET'
    | 'HEAVYWEIGHT_HOODIE'
    | 'SOFTSHELL_VEST'
    | 'FLEECE_JOGGERS'
    | 'STRUCTURED_CAP'
    | 'VINTAGE_TEE';
  inscribedText: string;
  threadColor: 'GOLD_METALLIC' | 'STERLING_SILVER' | 'EMERALD_GREEN' | 'PURE_WHITE';
  placement: 'LEFT_CHEST' | 'RIGHT_SLEEVE' | 'BACK_COLLAR';
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
}

export class CustomKeepsakeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a preview specification including canvas placement, ISO 14067 LCA carbon grams,
   * local artisan embroidery labor hours, and the mandatory 15% charitable gift split.
   */
  generateKeepsakePreview(input: KeepsakePreviewInput) {
    const {
      garmentModel,
      inscribedText,
      threadColor,
      placement,
      quantity = 1,
      unitPriceCents = 8500, // e.g. £85.00 default
    } = input;

    if (!inscribedText || !inscribedText.trim()) {
      throw new Error('Invalid input: inscribedText is required for custom milestone embroidery.');
    }

    if (inscribedText.length > 80) {
      throw new Error('Invalid input: inscribedText exceeds 80 characters maximum.');
    }

    // LCA Carbon Footprint computation under ISO 14067 (Cradle-to-Gate)
    let baseLcaGrams = 450;
    let baseLaborHours = 1.5;

    switch (garmentModel) {
      case 'INSULATED_PUFFER_JACKET':
        baseLcaGrams = 780;
        baseLaborHours = 3.0;
        break;
      case 'TECH_FLEECE_JACKET':
        baseLcaGrams = 620;
        baseLaborHours = 2.5;
        break;
      case 'HEAVYWEIGHT_HOODIE':
        baseLcaGrams = 520;
        baseLaborHours = 2.0;
        break;
      case 'SOFTSHELL_VEST':
        baseLcaGrams = 410;
        baseLaborHours = 1.5;
        break;
      case 'FLEECE_JOGGERS':
        baseLcaGrams = 440;
        baseLaborHours = 1.6;
        break;
      case 'STRUCTURED_CAP':
        baseLcaGrams = 210;
        baseLaborHours = 1.0;
        break;
      case 'VINTAGE_TEE':
        baseLcaGrams = 290;
        baseLaborHours = 0.8;
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
      },
    });
  }
}
