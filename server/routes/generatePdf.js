const express = require('express');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = MARGIN + 10;

const FONTS_DIR = fs.existsSync(path.join(__dirname, '../fonts'))
  ? path.join(__dirname, '../fonts')
  : path.join(__dirname, '../../server/fonts');

const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD    = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

const SECTION_RE = /^(skills?|навыки|опыт|experience|education|образование|summary|about|обо\s*мне|projects?|проекты|contacts?|контакты|hard\s*skills|soft\s*skills)/i;

// Word-wrap: splits text into lines that fit within maxWidth
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    let testWidth = 0;
    try { testWidth = font.widthOfTextAtSize(test, fontSize); } catch { /* skip */ }

    if (testWidth > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

async function generateResumePDF({ resumeText, addedSkills = [] }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(FONT_REGULAR));
  const fontBold    = await pdfDoc.embedFont(fs.readFileSync(FONT_BOLD));

  const cAccent = rgb(0.53, 0.39, 0.96);
  const cText   = rgb(0.08, 0.08, 0.12);
  const cMuted  = rgb(0.45, 0.45, 0.55);
  const cAdded  = rgb(0.08, 0.65, 0.40);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const checkY = (needed) => {
    if (y - needed < BOTTOM_LIMIT) newPage();
  };

  // Render resume lines
  for (const rawLine of resumeText.split('\n')) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      y -= 5;
      continue;
    }

    if (SECTION_RE.test(line.trim())) {
      checkY(26);
      y -= 10;
      page.drawText(line.trim().toUpperCase(), {
        x: MARGIN, y, size: 9.5, font: fontBold, color: cAccent,
        maxWidth: CONTENT_W,
      });
      y -= 5;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 0.5, color: cAccent, opacity: 0.3,
      });
      y -= 10;
      continue;
    }

    const isAdded = addedSkills.length > 0 &&
      addedSkills.some(s => line.toLowerCase().includes(s.toLowerCase()));

    const fontSize   = 9.5;
    const lineHeight = fontSize * 1.65;
    const wrapped    = wrapText(line, fontRegular, fontSize, CONTENT_W);

    for (const wLine of wrapped) {
      checkY(lineHeight);
      page.drawText(wLine, {
        x: MARGIN, y,
        size: fontSize,
        font:  isAdded ? fontBold    : fontRegular,
        color: isAdded ? cAdded      : cText,
        maxWidth: CONTENT_W,
      });
      y -= lineHeight;
    }
  }

  // Page numbers
  const pages = pdfDoc.getPages();
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      p.drawText(`page ${i + 1} / ${pages.length}`, {
        x: PAGE_W - MARGIN - 50, y: 20,
        size: 7.5, font: fontRegular, color: cMuted,
      });
    });
  }

  return pdfDoc.save();
}

router.post('/', async (req, res) => {
  const { resumeText, addedSkills = [] } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'resumeText is required' });

  try {
    const pdfBytes = await generateResumePDF({ resumeText, addedSkills });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="adapted_resume.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
