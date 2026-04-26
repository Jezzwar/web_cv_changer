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

// Works both from server/routes/ and from api/ (Vercel)
const FONTS_DIR = fs.existsSync(path.join(__dirname, '../fonts'))
  ? path.join(__dirname, '../fonts')
  : path.join(__dirname, '../../server/fonts');

const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

const SECTION_RE = /^(skills?|навыки|опыт|experience|education|образование|summary|about|обо\s*мне|projects?|проекты|contacts?|контакты|hard\s*skills|soft\s*skills)/i;

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    try {
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    } catch {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateResumePDF({ resumeText, name, addedSkills = [] }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regularBytes = fs.readFileSync(FONT_REGULAR);
  const boldBytes = fs.readFileSync(FONT_BOLD);
  const fontRegular = await pdfDoc.embedFont(regularBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);

  const cBg = rgb(0.055, 0.055, 0.1);
  const cAccent = rgb(0.53, 0.39, 0.96);
  const cText = rgb(0.12, 0.12, 0.18);
  const cMuted = rgb(0.45, 0.45, 0.55);
  const cAdded = rgb(0.13, 0.75, 0.47);
  const cWhite = rgb(1, 1, 1);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const checkY = (needed = 20) => {
    if (y - needed < MARGIN + 20) newPage();
  };

  // Header
  page.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: cBg });
  page.drawText(name || 'Resume', { x: MARGIN, y: PAGE_H - 38, size: 22, font: fontBold, color: cWhite });
  page.drawText('Adapted with ResumeAI', { x: MARGIN, y: PAGE_H - 60, size: 9, font: fontRegular, color: rgb(0.6, 0.6, 0.8) });

  y = PAGE_H - 98;

  // Added skills banner
  if (addedSkills.length > 0) {
    checkY(44);
    const bannerText = '★  Added by AI: ' + addedSkills.join(' · ');
    page.drawRectangle({ x: MARGIN, y: y - 36, width: CONTENT_W, height: 36, color: rgb(0.53, 0.39, 0.96, 0.07), borderColor: cAccent, borderWidth: 0.5 });
    page.drawText(bannerText.length > 90 ? bannerText.slice(0, 90) + '...' : bannerText, {
      x: MARGIN + 10, y: y - 23, size: 8.5, font: fontRegular, color: cAccent,
    });
    y -= 48;
  }

  y -= 12;

  // Resume body
  const lines = resumeText.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      y -= 5;
      continue;
    }

    const isSection = SECTION_RE.test(line.trim());

    if (isSection) {
      checkY(28);
      y -= 8;
      page.drawText(line.trim().toUpperCase(), { x: MARGIN, y, size: 9, font: fontBold, color: cAccent });
      y -= 5;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: cAccent, opacity: 0.35 });
      y -= 12;
      continue;
    }

    const isAddedLine = addedSkills.length > 0 &&
      addedSkills.some(s => line.toLowerCase().includes(s.toLowerCase()));

    const fontSize = 9.5;
    const lineHeight = fontSize * 1.6;
    const wrapped = wrapText(line, fontRegular, fontSize, CONTENT_W);

    for (const wLine of wrapped) {
      checkY(lineHeight);
      page.drawText(wLine, {
        x: MARGIN, y,
        size: fontSize,
        font: isAddedLine ? fontBold : fontRegular,
        color: isAddedLine ? cAdded : cText,
      });
      y -= lineHeight;
    }
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`ResumeAI  ·  page ${i + 1} of ${pages.length}`, {
      x: MARGIN, y: 20, size: 7.5, font: fontRegular, color: cMuted,
    });
  });

  return pdfDoc.save();
}

router.post('/', async (req, res) => {
  const { resumeText, name, addedSkills = [] } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'resumeText is required' });

  try {
    const pdfBytes = await generateResumePDF({ resumeText, name, addedSkills });
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
