import PDFDocument from 'pdfkit';

export function buildTimetablePdfBuffer({ title, weekLabel, slots }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title || 'Study Timetable', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(weekLabel || '');
    doc.moveDown();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDay = {};
    for (const s of slots || []) {
      if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
      byDay[s.dayOfWeek].push(s);
    }

    for (let d = 0; d < 7; d++) {
      const list = byDay[d] || [];
      doc.fontSize(12).fillColor('#000').text(`${days[d]}`, { continued: false });
      if (!list.length) {
        doc.fontSize(10).fillColor('#888').text('  —', { indent: 12 });
      } else {
        list
          .sort((a, b) => a.hourLabel.localeCompare(b.hourLabel))
          .forEach((s) => {
            doc
              .fontSize(10)
              .fillColor('#333')
              .text(`  • ${s.hourLabel}: ${s.title}`, { indent: 12 });
          });
      }
      doc.moveDown(0.4);
    }

    doc.end();
  });
}
