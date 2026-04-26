require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const analyzeRouter = require('./routes/analyze');
const generatePdfRouter = require('./routes/generatePdf');
const { parseJobFromUrl } = require('./parser');
const { verifyToken } = require('./supabase');
const usage = require('./usage');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Max 20 AI analyses per IP per hour — protects the free Gemini quota
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait an hour and try again.' },
});

// General rate limiter for other protected endpoints
const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait an hour and try again.' },
});

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — no token' });
  }
  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized — invalid token' });
  }
  req.user = user;
  next();
};

app.use('/api/analyze', analyzeLimiter, authMiddleware, analyzeRouter);
app.use('/api/generate-pdf', authMiddleware, generatePdfRouter);

app.post('/api/parse-url', generalLimiter, authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    const result = await parseJobFromUrl(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load page: ' + err.message });
  }
});

app.get('/api/usage', authMiddleware, (req, res) => res.json(usage.getStatus()));

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
