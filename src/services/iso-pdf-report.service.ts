import { PrismaClient, TransactionStatus } from '@prisma/client';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { runWithRls, UserAuthScope } from '../db/rls';

export interface GenerateIsoPdfReportInput {
  reportId: string;
  user: UserAuthScope;
}

export interface IsoPdfReportOutput {
  pdfBuffer: Buffer;
  docHash: string;
  auditRefId: string;
  licenseeName: string;
}

export class IsoPdfReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates an Executive Boardroom-Grade ISO 14001 / 50001 Integrated Audit Report & Log Matrix
   * with Dual-Impact Summary (Carbon + Green Jobs) and SHA-256 cryptographic watermarking.
   */
  async generateAuditReportPdf(input: GenerateIsoPdfReportInput): Promise<IsoPdfReportOutput> {
    const { reportId, user } = input;

    return runWithRls(this.prisma, user, async (tx) => {
      // 1. Fetch Report and Matrix Rows
      const report = await tx.auditInspectionReport.findUnique({
        where: { id: reportId },
        include: {
          licensee: true,
          matrixRows: { orderBy: { pillarIndex: 'asc' } },
        },
      });

      if (!report) {
        throw new Error(`Audit inspection report '${reportId}' not found.`);
      }

      // Security check
      if (user.role === 'PARTNER' && report.licenseeId !== user.licenseeId) {
        throw new Error('Forbidden: Cannot generate PDF report for other licensees.');
      }

      // Statutory Export Lock Check under ISO Clause 10.2 / Milestone ISO-2
      const unresolvedAnomalies = await tx.nonConformanceEvent.findMany({
        where: { licenseeId: report.licenseeId, isResolved: false },
      });
      if (unresolvedAnomalies.length > 0) {
        const lockErr: any = new Error(
          `Transparency export locked: ${unresolvedAnomalies.length} unresolved baseline anomaly event(s) require supervisor verification under ISO Clause 10.2.`
        );
        lockErr.statusCode = 423;
        lockErr.details = unresolvedAnomalies;
        throw lockErr;
      }

      // 2. Query Dual-Impact Stats (Settled charity gift & verified jobs)
      const settledTransactions = await tx.transaction.findMany({
        where: { licenseeId: report.licenseeId, status: TransactionStatus.SETTLED },
        include: { financialSplit: true, customKeepsakeSpec: true },
      });

      const totalSettledCount = settledTransactions.length;
      const totalCharityCents = settledTransactions.reduce(
        (sum, t) => sum + (t.financialSplit?.charityGiftCents || 0),
        0
      );

      const latestJobReport = await tx.jobCreationReport.findFirst({
        where: { licenseeId: report.licenseeId },
        orderBy: { periodEnd: 'desc' },
      });

      const totalJobsCreated = latestJobReport ? latestJobReport.jobsCreated : null;
      const totalArtisanHours = settledTransactions.reduce(
        (sum, t) => sum + (t.customKeepsakeSpec?.artisanLaborHours || 0),
        0
      );

      // 3. Compute Canonical SHA-256 Hash across all report data
      const canonicalData = JSON.stringify({
        auditRefId: report.auditRefId,
        licenseeId: report.licenseeId,
        licenseeName: report.licensee.name,
        facilityType: report.facilityType,
        leadAuditorName: report.leadAuditorName,
        evaluationDate: report.evaluationDate.toISOString(),
        weightedScore: report.weightedScore,
        overallGrade: report.overallGrade,
        greenwashingRiskLevel: report.greenwashingRiskLevel,
        rows: report.matrixRows.map((r) => ({
          pillar: r.pillarIndex,
          score: r.scorePoints,
          grade: r.complianceGrading,
        })),
        dualImpact: {
          settledCount: totalSettledCount,
          charityCents: totalCharityCents,
          jobsCreated: totalJobsCreated,
          artisanHours: totalArtisanHours,
        },
      });

      const docHash = crypto.createHash('sha256').update(canonicalData).digest('hex');

      // 4. Generate PDF via pdfkit
      const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, compress: false, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: any) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: any) => reject(err));

        // Header Section
        doc.fontSize(18).text('ISO 14001 / 50001 INTEGRATED AUDIT REPORT', { align: 'center', bold: true } as any);
        doc.fontSize(10).text('Statutory Continuous Assurance & Dual-Impact Governance Matrix', { align: 'center' });
        doc.moveDown(0.75);

        // Metadata Box
        doc.rect(40, doc.y, 515, 65).fillAndStroke('#f8fafc', '#cbd5e1');
        const boxTop = doc.y + 8;
        doc.fillColor('#0f172a').fontSize(9);
        doc.text(`Organization: ${report.licensee.name} (${report.licenseeId})`, 50, boxTop);
        doc.text(`Audit Ref ID: ${report.auditRefId}`, 50, boxTop + 14);
        doc.text(`Facility / Asset Scope: ${report.facilityType}`, 50, boxTop + 28);
        doc.text(`Evaluation Date: ${report.evaluationDate.toISOString().split('T')[0]}`, 320, boxTop);
        doc.text(`Lead Auditor: ${report.leadAuditorName}`, 320, boxTop + 14);
        doc.text(`Risk Grade: ${report.greenwashingRiskLevel}`, 320, boxTop + 28);

        doc.y = boxTop + 45;
        doc.moveDown(1.5);

        // Executive Scorecard Summary
        doc.fontSize(12).fillColor('#0f172a').text('1. EXECUTIVE ASSURANCE SCORECARD', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10).text(`Weighted Assurance Score: ${report.weightedScore.toFixed(2)} / 5.00`);
        doc.text(`Overall Conformance Grade: ${report.overallGrade}`);
        doc.text(`Greenwashing Risk Category: ${report.greenwashingRiskLevel}`);
        doc.moveDown(0.8);

        // Dual-Impact Summary Section
        doc.fontSize(12).text('2. DUAL-IMPACT PERFORMANCE (CARBON + JOBS)', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9).text(`• Total Settled Environmental Licensing Drops: ${totalSettledCount}`);
        doc.text(`• Total 15% Charitable Gift Routed: £${(totalCharityCents / 100).toFixed(2)} (${totalCharityCents} cents)`);
        if (totalJobsCreated !== null) {
          doc.text(`• Verified Green Jobs Created (Quarterly Filing): ${totalJobsCreated} jobs`);
        }
        if (totalArtisanHours > 0) {
          doc.text(`• Local Artisan Keepsake Embroidery Labor: ${totalArtisanHours.toFixed(1)} verified hours`);
        }
        doc.moveDown(0.8);

        // 5-Pillar Matrix Table
        doc.fontSize(12).text('3. ISO COMPLIANCE & GOVERNANCE MATRIX', { underline: true });
        doc.moveDown(0.5);

        report.matrixRows.forEach((row, i) => {
          doc.fontSize(9).fillColor('#1e293b').text(
            `Pillar ${row.pillarIndex}: ${row.pillarName} (Weight: ${(row.weight * 100).toFixed(0)}% | Score: ${row.scorePoints.toFixed(1)}/5.0)`,
            { bold: true } as any
          );
          doc.fontSize(8).fillColor('#475569');
          doc.text(`   Clause Link: ${row.isoClauseLink}`);
          doc.text(`   Legal Mandate: ${row.legalMandate}`);
          if (row.auditorFindings) {
            doc.text(`   Findings: ${row.auditorFindings}`);
          }
          doc.moveDown(0.4);
        });

        doc.moveDown(0.8);

        // Section X Legal Boundary Block
        doc.fontSize(8).fillColor('#64748b').text(
          'SECTION X LEGAL DISCLAIMER & STATUTORY ASSURANCE BOUNDARY: This document constitutes an administrative data assurance and readiness record under statutory data processing frameworks. GHG Logo Drop does not operate as an accredited ISO registrar or carbon credit broker. Final statutory certification requires third-party inspection by an accredited body under ISO 14065.',
          { align: 'justify' }
        );
        doc.moveDown(0.5);

        // Cryptographic Footer Integrity Stamp
        doc.fontSize(8).fillColor('#0f172a').text(
          '-------------------------------------------------------------------------------------------------------------------',
          { align: 'center' }
        );
        doc.fontSize(8).text(`DOCUMENT INTEGRITY VERIFIED (SHA-256): ${docHash}`, { align: 'center' });

        doc.end();
      });

      return {
        pdfBuffer,
        docHash,
        auditRefId: report.auditRefId,
        licenseeName: report.licensee.name,
      };
    });
  }
}
