import { PrismaClient, TransactionStatus } from '@prisma/client';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { runWithRls, UserAuthScope } from '../db/rls';

export interface CertificateQueryParams {
  licenseeId: string;
  user: UserAuthScope;
  from?: string;
  to?: string;
}

export interface CertificateAggregateData {
  licenseeId: string;
  licenseeName: string;
  settledCount: number;
  grossAmountCentsSum: number;
  charityGiftCentsSum: number;
  fromDate: Date | null;
  toDate: Date | null;
  documentIntegrityHash: string;
}

/**
 * Queries real database aggregates for a given licensee and date range inside an RLS-scoped transaction.
 */
export async function getCertificateAggregateData(
  prisma: PrismaClient,
  params: CertificateQueryParams
): Promise<CertificateAggregateData> {
  const { licenseeId, user, from, to } = params;

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  return runWithRls(prisma, user, async (tx) => {
    const licensee = await tx.licensee.findUnique({
      where: { id: licenseeId },
    });

    const whereCondition: any = {
      licenseeId,
      status: TransactionStatus.SETTLED,
    };

    if (fromDate || toDate) {
      whereCondition.createdAt = {};
      if (fromDate) whereCondition.createdAt.gte = fromDate;
      if (toDate) whereCondition.createdAt.lte = toDate;
    }

    const settledTransactions = await tx.transaction.findMany({
      where: whereCondition,
      include: {
        financialSplit: true,
      },
    });

    const settledCount = settledTransactions.length;
    const grossAmountCentsSum = settledTransactions.reduce(
      (sum, txRow) => sum + txRow.grossAmountCents,
      0
    );
    const charityGiftCentsSum = settledTransactions.reduce(
      (sum, txRow) => sum + (txRow.financialSplit?.charityGiftCents || 0),
      0
    );

    const canonicalDataString = JSON.stringify({
      licenseeId,
      licenseeName: licensee?.name || licenseeId,
      settledCount,
      grossAmountCentsSum,
      charityGiftCentsSum,
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
    });

    const documentIntegrityHash = crypto
      .createHash('sha256')
      .update(canonicalDataString)
      .digest('hex');

    return {
      licenseeId,
      licenseeName: licensee?.name || licenseeId,
      settledCount,
      grossAmountCentsSum,
      charityGiftCentsSum,
      fromDate,
      toDate,
      documentIntegrityHash,
    };
  });
}

/**
 * Generates a PDF compliance certificate from real aggregate data using pdfkit.
 */
export async function generateCertificatePdf(data: CertificateAggregateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, compress: false });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Document Header
    doc.fontSize(20).text('GHG Logo Drop — Compliance Certificate', { align: 'center' });
    doc.moveDown();

    // Licensee & Date Range Scope
    doc.fontSize(12).text(`Licensee: ${data.licenseeName} (${data.licenseeId})`);
    doc.text(
      `Date Range: ${data.fromDate ? data.fromDate.toISOString().split('T')[0] : 'All Time'} to ${
        data.toDate ? data.toDate.toISOString().split('T')[0] : 'All Time'
      }`
    );
    doc.moveDown();

    // Aggregate Ledger Figures
    doc.fontSize(14).text('Summary Aggregates', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Settled Logo Drops: ${data.settledCount}`);
    doc.text(
      `Total Gross Volume: £${(data.grossAmountCentsSum / 100).toFixed(2)} (${
        data.grossAmountCentsSum
      } cents)`
    );
    doc.text(
      `Total Settled Charity Contribution: £${(data.charityGiftCentsSum / 100).toFixed(2)} (${
        data.charityGiftCentsSum
      } cents)`
    );
    doc.moveDown(2);

    // Footer Integrity Check
    doc
      .fontSize(10)
      .text('--------------------------------------------------------------------------------');
    doc.fontSize(9).text(`document integrity check (SHA-256): ${data.documentIntegrityHash}`, {
      align: 'left',
    });

    doc.end();
  });
}
