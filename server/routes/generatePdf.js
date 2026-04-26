const express = require('express');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const FONTS_DIR = path.join(__dirname, '../fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'TimesNewRoman.ttf');
const FONT_BOLD    = path.join(FONTS_DIR, 'TimesNewRoman-Bold.ttf');

const PAGE_W     = 595;  // A4
const PAGE_H     = 842;
const MARGIN_X   = 50;
const MARGIN_TOP = 50;
const MARGIN_BOT = 45;
const CONTENT_W  = PAGE_W - MARGIN_X * 2;

// Colours
const C_TEXT  = rgb(0.08, 0.08, 0.12);
const C_MUTED = rgb(0.45, 0.45, 0.55);
const C_RULE  = rgb(0.75, 0.75, 0.80);  // light grey divider

const SECTION_RE = /^(skills?|навыки|опыт|experience|education|образование|summary|about|обо\s*мне|contacts?|контакты|projects?|проекты|hard\s*skills|soft\s*skills|certifications?|сертификат|awards?|achievements?)/i;

// Lines like "Company | Role | 2020–2024" are job/edu header lines → bold
const HEADER_LINE_RE = /\|/;

function wrapText(text, font, size, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    let tw = 0;
    try { tw = font.widthOfTextAtSize(test, size); } catch { /**/ }
    if (tw > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function parseResume(text) {
  const lines = text.split('\n').map(l => l.trimEnd());
  const sections = [];
  let header = [];
  let current = null;

  for (const line of lines) {
    if (SECTION_RE.test(line.trim())) {
      if (current) sections.push(current);
      current = { title: line.trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      header.push(line);
    }
  }
  if (current) sections.push(current);
  return { header, sections };
}

// Render resume onto pdfDoc pages; returns page count
async function renderResume(pdfDoc, fontReg, fontBold, resumeText, fontSize) {
  const lineH      = fontSize * 1.45;
  const sectionGap = 9;
  const afterRule  = 11;   // bigger gap after divider

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y    = PAGE_H - MARGIN_TOP;

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y    = PAGE_H - MARGIN_TOP;
  };
  const need = (h) => { if (y - h < MARGIN_BOT) newPage(); };

  const drawLines = (rawText, font, size, color, indent = 0) => {
    const wrapped = wrapText(rawText, font, size, CONTENT_W - indent);
    for (const ln of wrapped) {
      need(lineH);
      page.drawText(ln, { x: MARGIN_X + indent, y, size, font, color });
      y -= lineH;
    }
  };

  const { header, sections } = parseResume(resumeText);

  // ── Name + contacts ──────────────────────────────────────────────────────
  const headerLines = header.filter(l => l.trim());
  if (headerLines.length > 0) {
    const nameSize = Math.min(fontSize * 1.5, 15);
    need(nameSize + 6);
    page.drawText(headerLines[0], {
      x: MARGIN_X, y,
      size: nameSize, font: fontBold, color: C_TEXT,
    });
    y -= nameSize + 5;

    for (const ln of headerLines.slice(1)) {
      if (!ln.trim()) continue;
      need(lineH);
      page.drawText(ln, {
        x: MARGIN_X, y, size: fontSize, font: fontReg, color: C_MUTED,
        maxWidth: CONTENT_W,
      });
      y -= lineH;
    }
    y -= 5;
  }

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const sec of sections) {
    need(sectionGap + lineH + 3 + afterRule);
    y -= sectionGap;

    // Section title — black bold
    page.drawText(sec.title.toUpperCase(), {
      x: MARGIN_X, y, size: fontSize, font: fontBold, color: C_TEXT,
    });
    y -= fontSize * 0.4 + 2;

    // Divider — light grey
    page.drawLine({
      start: { x: MARGIN_X, y },
      end:   { x: PAGE_W - MARGIN_X, y },
      thickness: 0.6, color: C_RULE,
    });
    y -= afterRule;

    // Section body
    for (const raw of sec.lines) {
      if (!raw.trim()) { y -= lineH * 0.3; continue; }

      const isEntryHeader = HEADER_LINE_RE.test(raw);
      const isBullet      = /^-\s/.test(raw.trim()) && !isEntryHeader;
      const text   = isBullet ? raw.trim().replace(/^-\s*/, '') : raw.trim();
      const indent = isBullet ? fontSize * 1.2 : 0;
      const font   = (isBullet ? false : isEntryHeader) ? fontBold : fontReg;

      if (isBullet) {
        need(lineH);
        page.drawText('•', {
          x: MARGIN_X + fontSize * 0.3, y,
          size: fontSize, font: fontReg, color: C_TEXT,
        });
      }

      drawLines(text, font, fontSize, C_TEXT, indent);
    }
  }

  return pdfDoc.getPageCount();
}

async function generateResumePDF({ resumeText, addedSkills = [] }) {
  const fontRegBytes  = fs.readFileSync(FONT_REGULAR);
  const fontBoldBytes = fs.readFileSync(FONT_BOLD);

  // Try font sizes from 10 down to 7 until content fits on 1 page
  const SIZES = [10, 9.5, 9, 8.5, 8, 7.5, 7];

  for (let i = 0; i < SIZES.length; i++) {
    const fontSize = SIZES[i];
    const pdfDoc   = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontReg  = await pdfDoc.embedFont(fontRegBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const pageCount = await renderResume(pdfDoc, fontReg, fontBold, resumeText, fontSize);

    if (pageCount === 1 || i === SIZES.length - 1) {
      console.log(`[PDF] font size ${fontSize}pt → ${pageCount} page(s)`);
      return pdfDoc.save();
    }
    // More than 1 page — try smaller font
  }
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
