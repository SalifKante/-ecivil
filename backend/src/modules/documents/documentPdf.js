import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Renders a demo document as a PDF buffer.
 *
 * NOT a real official document, and built so it cannot be mistaken for one: a
 * diagonal SPÉCIMEN watermark across the page, a banner at the top, and a footer
 * repeating that it has no legal value. CLAUDE.md §2 requires all three — do not
 * remove them to make a screenshot look better.
 */

const GREEN = '#0f7b3f';
const GOLD = '#b98900';
const SLATE = '#334155';
const MUTED = '#64748b';

const SPECIMEN_TEXT = 'SPÉCIMEN — PROTOTYPE / SANS VALEUR LÉGALE';

function drawWatermark(doc) {
  const { width, height } = doc.page;

  doc.save();
  doc.rotate(-35, { origin: [width / 2, height / 2] });
  doc.fontSize(34).fillColor('#ef4444').opacity(0.16);

  // Repeated bands, so cropping the page cannot remove the mark. Every y stays
  // inside the page: a band drawn past the bottom makes PDFKit start a new page,
  // which silently turned this one-page document into three.
  for (const y of [120, 300, 480, 660]) {
    doc.text(SPECIMEN_TEXT, 0, y, { width, align: 'center', lineBreak: false });
  }

  doc.restore();
  doc.opacity(1);

  // The watermark leaves the text cursor at the bottom of the page. save/restore
  // covers graphics state but NOT the cursor, so reset it or the header below
  // starts where the last band ended.
  doc.x = doc.page.margins.left;
  doc.y = doc.page.margins.top;
}

function drawHeader(doc, { title }) {
  doc
    .fillColor(GREEN)
    .fontSize(9)
    .text("RÉPUBLIQUE DU MALI — Un Peuple, Un But, Une Foi", { align: 'center' });

  doc.moveDown(0.2);
  doc.fillColor(SLATE).fontSize(16).text('eCivil', { align: 'center' });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text('Plateforme Unifiée de la Citoyenneté Numérique', { align: 'center' });

  doc.moveDown(1);

  // Impossible-to-miss banner, above the document title.
  const bannerY = doc.y;
  doc.rect(50, bannerY, doc.page.width - 100, 26).fill('#fee2e2');
  doc
    .fillColor('#b91c1c')
    .fontSize(10)
    .text(SPECIMEN_TEXT, 50, bannerY + 8, { width: doc.page.width - 100, align: 'center' });

  doc.y = bannerY + 40;
  doc.fillColor(SLATE).fontSize(18).text(title, { align: 'center' });
  doc.moveDown(1.5);
}

function drawField(doc, label, value) {
  const y = doc.y;
  doc.fillColor(MUTED).fontSize(9).text(label, 60, y);
  doc
    .fillColor(SLATE)
    .fontSize(11)
    .text(value ?? '—', 60, y + 12, { width: doc.page.width - 200 });
  doc.moveDown(1.4);
}

/**
 * @param {object} data
 * @param {string} data.title      Document label, e.g. "Extrait d'acte de naissance"
 * @param {string} data.reference  Request reference (ECV-YYYY-NNNNNN)
 * @param {object} data.citizen    { firstName, lastName, nina, birthDate, birthPlace }
 * @param {string} data.verifyUrl  Public verification URL encoded in the QR code
 * @param {Date}   data.issuedAt
 * @returns {Promise<Buffer>}
 */
export async function renderDocumentPdf({ title, reference, citizen, verifyUrl, issuedAt }) {
  // Generated before the document stream opens: a failure here should abort the
  // render rather than leave a half-written PDF with no QR code on it.
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 260 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  drawWatermark(doc);
  drawHeader(doc, { title });

  drawField(doc, 'Référence de la demande', reference);
  drawField(doc, 'Titulaire', `${citizen.firstName} ${citizen.lastName}`);
  drawField(doc, 'Numéro NINA', citizen.nina);
  drawField(
    doc,
    'Né(e) le',
    citizen.birthDate ? new Date(citizen.birthDate).toLocaleDateString('fr-FR') : '—',
  );
  drawField(doc, 'Lieu de naissance', citizen.birthPlace);
  drawField(doc, "Date d'émission", issuedAt.toLocaleDateString('fr-FR'));

  // QR block, bottom-right.
  const qrSize = 120;
  const qrX = doc.page.width - 50 - qrSize;
  const qrY = doc.page.height - 230;

  doc.image(qrBuffer, qrX, qrY, { width: qrSize });
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .text('Vérifiez ce document', qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' });

  doc
    .fillColor(GOLD)
    .fontSize(9)
    .text(
      "Ce document est un spécimen produit par un prototype de démonstration. Il n'a aucune " +
        "valeur légale et ne peut être opposé à aucune administration. Les données qu'il " +
        'contient sont fictives.',
      50,
      doc.page.height - 90,
      { width: doc.page.width - 100, align: 'center' },
    );

  doc.end();
  return done;
}
