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

// Patterns that indicate an auth wall / redirect instead of actual content
const AUTH_WALL_PATTERNS = [
  { site: /linkedin\.com/, signal: /authwall|sign in|join linkedin|more than \d+ вакансии|more than \d+ jobs/i },
  { site: /linkedin\.com/, signal: /uis-middleware-auth/i },
];

async function parseJobFromUrl(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
    timeout: 10000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);

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
    let maxLen = 0;
    $('div, section, article, main').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt.length > maxLen) {
        maxLen = txt.length;
        body = txt;
      }
    });
  }

  const cleanText = (t) => t.replace(/\s{3,}/g, '\n\n').replace(/\t/g, ' ').trim();
  const finalTitle = cleanText(title);
  const finalBody = cleanText(body || $('body').text());

  // Detect auth wall — site returned login page instead of job content
  for (const { site, signal } of AUTH_WALL_PATTERNS) {
    if (site.test(url) && (signal.test(finalTitle) || signal.test(finalBody.slice(0, 500)))) {
      const err = new Error(
        'LinkedIn требует авторизации для просмотра вакансий. ' +
        'Откройте вакансию в браузере, скопируйте текст описания и вставьте его через вкладку «Text».'
      );
      err.authWall = true;
      throw err;
    }
  }

  // Check that we got meaningful content
  if (!config && finalBody.length < 200) {
    throw new Error('Не удалось извлечь текст со страницы. Попробуйте скопировать текст вручную через вкладку «Text».');
  }

  return { title: finalTitle, text: finalBody };
}

module.exports = { parseJobFromUrl };
