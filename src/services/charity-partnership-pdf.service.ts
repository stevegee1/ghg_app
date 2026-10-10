import PDFDocument from 'pdfkit';
import { Charity } from '@prisma/client';

export async function generateCharityPartnershipPdf(charity: Charity): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('NFTYLOGS', { align: 'center' });
      doc.moveDown(0.3);

      doc
        .fontSize(13)
        .font('Helvetica')
        .fillColor('#0284c7')
        .text('Official Statutory ESG Charity Partner Certificate', { align: 'center' });
      doc.moveDown(0.3);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('NFTYLOGS Limited | Registered in England and Wales, company no. 15230476', { align: 'center' });
      doc.moveDown(1.5);

      // Divider Line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(1);

      // Certificate Body
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('STATUTORY PARTNER RECOGNITION');
      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`This document certifies that ${charity.name} is a designated Statutory Climate & Humanitarian Charity Partner in accordance with the GHG Platform ESG Split Engine.`);
      doc.moveDown(1);

      // Partner Specs Table
      const startDateStr = charity.contractStartDate
        ? new Date(charity.contractStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Pending Onboarding';
      const endDateStr = charity.contractEndDate
        ? new Date(charity.contractEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Pending Onboarding';

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Partnership Dossier Specifications:');
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10).fillColor('#475569');
      doc.text(`Charity Legal Name:       ${charity.name}`);
      doc.text(`Charity ID:               ${charity.id}`);
      if (charity.registeredCharityNumber) {
        doc.text(`Charity Reg Number:       ${charity.registeredCharityNumber}`);
      }
      doc.text(`Statutory Status:         ${charity.status}`);
      doc.text(`Statutory ESG Share:      Equal 1/3 share of the 15% platform-wide ESG split (5.00%)`);
      doc.text(`Contract Term Start:      ${startDateStr}`);
      doc.text(`Contract Term End:        ${endDateStr} (1-year statutory tenure)`);
      if (charity.stripeConnectedAccountId) {
        doc.text(`Stripe Connected ID:      ${charity.stripeConnectedAccountId}`);
      }
      doc.moveDown(1.5);

      // Mission Statement
      if (charity.statement) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Approved Impact Statement:');
        doc.moveDown(0.3);
        doc.fontSize(9.5).font('Helvetica-Oblique').fillColor('#334155').text(`"${charity.statement}"`);
        doc.moveDown(1.5);
      }

      // Legal Disclaimer
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.8);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text('Statutory ESG charitable routing. Figures reflect settled platform transactions and direct Stripe Connect disbursements. The platform provides automated routing infrastructure and does not independently audit third-party charitable operations.');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
