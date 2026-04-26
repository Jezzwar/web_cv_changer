// Vercel serverless entry — wraps the Express app
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('../server/routes/analyze');
const generatePdfRouter = require('../server/routes/generatePdf');
const { parseJobFromUrl } = require('../server/parser');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/analyze', analyzeRouter);
app.use('/api/generate-pdf', generatePdfRouter);

app.post('/api/parse-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL обязателен' });
  try {
    const result = await parseJobFromUrl(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить страницу: ' + err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

module.exports = app;
