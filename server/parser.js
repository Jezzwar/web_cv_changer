const axios = require('axios');
const cheerio = require('cheerio');

// Selectors for popular job sites
const SITE_CONFIGS = [
  {
    match: /hh\.ru/,
    title: '[data-qa="vacancy-title"]',
    body: '[data-qa="vacancy-description"]',
  },
  {
    match: /linkedin\.com/,
    title: '.top-card-layout__title',
    body: '.description__text',
  },
  {
    match: /indeed\.com/,
    title: '[data-testid="jobsearch-JobInfoHeader-title"]',
    body: '#jobDescriptionText',
  },
  {
    match: /superjob\.ru/,
    title: 'h1[class*="vacancy"]',
    body: '[class*="vacancy__description"]',
  },
  {
    match: /zarplata\.ru/,
    title: 'h1',
    body: '.vacancy-description',
  },
];

async function parseJobFromUrl(url) {
  const { data, headers } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(data);

  // Remove noise
  $('script, style, nav, footer, header, [class*="cookie"], [class*="banner"]').remove();

  // Try site-specific selectors first
  const config = SITE_CONFIGS.find(c => c.match.test(url));
  let title = '';
  let body = '';

  if (config) {
    title = $(config.title).first().text().trim();
    body = $(config.body).first().text().trim();
  }

  // Fallback: grab biggest text block
  if (!body) {
    title = $('h1').first().text().trim();
    // Find the element with the most text content
    let maxLen = 0;
    $('div, section, article, main').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt.length > maxLen) {
        maxLen = txt.length;
        body = txt;
      }
    });
  }

  // Clean up whitespace
  const cleanText = (t) => t.replace(/\s{3,}/g, '\n\n').replace(/\t/g, ' ').trim();

  return {
    title: cleanText(title),
    text: cleanText(body || $('body').text()),
  };
}

module.exports = { parseJobFromUrl };
