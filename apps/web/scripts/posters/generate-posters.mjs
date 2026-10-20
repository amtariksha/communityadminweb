// FILE-40 — renders the Platform Files posters (A4, print-ready PDFs) from
// src/app/(dashboard)/documents/platform/posters.json into public/posters/.
// Our own material only. The admin web has no PDF library, so run it with the
// API's pdfkit, from apps/web:
//   NODE_PATH=<communityos>/node_modules/.pnpm/pdfkit@0.18.0/node_modules node scripts/posters/generate-posters.mjs
import { createRequire } from 'node:module';
import { createWriteStream, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');
const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..', '..');
const posters = JSON.parse(readFileSync(join(web, 'src/app/(dashboard)/documents/platform/posters.json'), 'utf8'));

const INK = '#1f2937';
const ACCENT = '#1d4ed8';
const MARGIN = 56;

function steps(doc, list) {
  list.forEach((text, index) => {
    const y = doc.y;
    doc.circle(MARGIN + 14, y + 12, 14).fill(ACCENT);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text(String(index + 1), MARGIN, y + 4, { width: 28, align: 'center' });
    doc.fillColor(INK).font('Helvetica').fontSize(17).text(text, MARGIN + 44, y + 2, { width: doc.page.width - MARGIN * 2 - 44 });
    doc.moveDown(0.9);
  });
}

function footer(doc) {
  const y = doc.page.height - MARGIN - 70;
  doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(1).stroke('#9ca3af');
  doc.fillColor(INK).font('Helvetica').fontSize(13);
  doc.text('Society office: ______________________________', MARGIN, y + 16);
  doc.text('Phone: ______________________   Hours: ______________________', MARGIN, y + 40);
}

function render(poster) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: poster.title } });
  doc.pipe(createWriteStream(join(web, 'public/posters', `${poster.slug}.pdf`)));
  doc.rect(0, 0, doc.page.width, 12).fill(ACCENT);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(40).text(poster.title, MARGIN, MARGIN + 20);
  doc.moveDown(0.4).font('Helvetica').fontSize(19).fillColor('#374151').text(poster.summary);
  doc.moveDown(1.4);
  steps(doc, poster.steps);
  doc.moveDown(0.6).font('Helvetica-Oblique').fontSize(15).fillColor('#374151').text(poster.more, { width: doc.page.width - MARGIN * 2 });
  footer(doc);
  doc.end();
}

posters.forEach(render);
