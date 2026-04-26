const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { supabase } = require('../supabase');

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

// Known tech skills with canonical names and aliases
const SKILL_DICTIONARY = [
  { name: 'JavaScript', aliases: ['javascript', 'js', 'es6', 'es2015', 'ecmascript'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'Python', aliases: ['python', 'python3', 'python2'] },
  { name: 'Java', aliases: ['java'] },
  { name: 'C++', aliases: ['c\\+\\+', 'cpp', 'с\\+\\+'] },
  { name: 'C#', aliases: ['c#', 'csharp', 'с#'] },
  { name: 'Go', aliases: ['\\bgo\\b', 'golang'] },
  { name: 'Rust', aliases: ['rust'] },
  { name: 'PHP', aliases: ['php'] },
  { name: 'Ruby', aliases: ['ruby'] },
  { name: 'Kotlin', aliases: ['kotlin'] },
  { name: 'Swift', aliases: ['swift'] },
  { name: 'Scala', aliases: ['scala'] },
  { name: 'React', aliases: ['react', 'reactjs', 'react\\.js'] },
  { name: 'Vue', aliases: ['vue', 'vuejs', 'vue\\.js'] },
  { name: 'Angular', aliases: ['angular', 'angularjs'] },
  { name: 'Next.js', aliases: ['next\\.?js', 'nextjs'] },
  { name: 'Nuxt', aliases: ['nuxt', 'nuxt\\.js'] },
  { name: 'Svelte', aliases: ['svelte'] },
  { name: 'HTML', aliases: ['html5?', 'html'] },
  { name: 'CSS', aliases: ['css3?', 'css'] },
  { name: 'Sass', aliases: ['sass', 'scss'] },
  { name: 'Tailwind', aliases: ['tailwind', 'tailwindcss'] },
  { name: 'Webpack', aliases: ['webpack'] },
  { name: 'Vite', aliases: ['vite'] },
  { name: 'Node.js', aliases: ['node\\.?js', 'nodejs'] },
  { name: 'Express', aliases: ['express', 'express\\.js'] },
  { name: 'NestJS', aliases: ['nest\\.?js', 'nestjs'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'Flask', aliases: ['flask'] },
  { name: 'FastAPI', aliases: ['fastapi'] },
  { name: 'Spring', aliases: ['spring', 'spring boot'] },
  { name: 'Laravel', aliases: ['laravel'] },
  { name: 'GraphQL', aliases: ['graphql'] },
  { name: 'REST API', aliases: ['rest\\s*api', 'restful', 'rest'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { name: 'Redis', aliases: ['redis'] },
  { name: 'SQLite', aliases: ['sqlite'] },
  { name: 'Elasticsearch', aliases: ['elasticsearch', 'elastic'] },
  { name: 'Supabase', aliases: ['supabase'] },
  { name: 'Firebase', aliases: ['firebase'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services'] },
  { name: 'GCP', aliases: ['gcp', 'google cloud'] },
  { name: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { name: 'Docker', aliases: ['docker'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'CI/CD', aliases: ['ci\\/cd', 'cicd', 'ci cd'] },
  { name: 'Jenkins', aliases: ['jenkins'] },
  { name: 'GitHub Actions', aliases: ['github\\s*actions'] },
  { name: 'Terraform', aliases: ['terraform'] },
  { name: 'Linux', aliases: ['linux', 'unix'] },
  { name: 'Git', aliases: ['\\bgit\\b'] },
  { name: 'Jira', aliases: ['jira'] },
  { name: 'Figma', aliases: ['figma'] },
  { name: 'Kafka', aliases: ['kafka'] },
  { name: 'RabbitMQ', aliases: ['rabbitmq'] },
  { name: 'Nginx', aliases: ['nginx'] },
];

// Russian requirement patterns — capture the object after keyword
const RU_PATTERNS = [
  /опыт\s+(?:работы\s+)?(?:с\s+|в\s+)?([^\n,;.]{3,60})/gi,
  /знание\s+([^\n,;.]{3,60})/gi,
  /умение\s+(?:работать\s+с\s+)?([^\n,;.]{3,60})/gi,
  /владение\s+([^\n,;.]{3,60})/gi,
  /понимание\s+([^\n,;.]{3,60})/gi,
  /навык[и]?\s+(?:работы\s+с\s+)?([^\n,;.]{3,60})/gi,
];

function normalize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Extract canonical skill names from text
function extractSkills(text) {
  const found = new Set();
  const lower = normalize(text);

  for (const skill of SKILL_DICTIONARY) {
    for (const alias of skill.aliases) {
      const re = new RegExp(`(?<![a-zA-Z])${alias}(?![a-zA-Z])`, 'i');
      if (re.test(lower)) {
        found.add(skill.name);
        break;
      }
    }
  }

  return [...found];
}

// Extract ONLY from the Skills section of a resume.
// Falls back to full text if no Skills section found.
function extractResumeSkills(text) {
  const lines = text.split('\n');
  const SKILLS_HEADER = /^(skills?|навыки|технические\s*навыки|hard\s*skills|tech\s*skills|core\s*skills)/i;
  const ANY_HEADER    = /^(experience|опыт|education|образование|projects?|проекты|summary|about|contacts?)/i;

  // Find skills section boundaries
  let start = -1;
  let end   = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (start === -1 && SKILLS_HEADER.test(trimmed)) {
      start = i + 1;
    } else if (start !== -1 && ANY_HEADER.test(trimmed)) {
      end = i;
      break;
    }
  }

  if (start !== -1) {
    // Skills section found — extract only from it
    const skillsText = lines.slice(start, end).join('\n');
    console.log('[resume] skills section found, lines', start, '-', end);
    console.log('[resume] skills text:', skillsText.slice(0, 200));
    return extractSkills(skillsText);
  }

  // No skills section — fall back to full text but warn
  console.log('[resume] no skills section found, scanning full text');
  return extractSkills(text);
}

// Extract Russian soft/contextual requirements
function extractRuRequirements(text) {
  const found = new Set();
  for (const pattern of RU_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      const phrase = match[1].trim();
      if (phrase.length > 2 && phrase.length < 80) {
        found.add(phrase.charAt(0).toUpperCase() + phrase.slice(1));
      }
    }
  }
  return [...found];
}

// Match job skills vs resume skills
function matchSkills(jobSkills, resumeSkills) {
  const resumeSet = new Set(resumeSkills.map(normalize));
  const matched = jobSkills.filter(s => resumeSet.has(normalize(s)));
  const missing = jobSkills.filter(s => !resumeSet.has(normalize(s)));

  console.log('[match] job:', jobSkills);
  console.log('[match] resume:', resumeSkills);
  console.log('[match] matched:', matched);
  console.log('[match] missing:', missing);

  return { matched, missing };
}

// Insert missing skills into the Skills section of resume text
function buildAdaptedResume(resumeText, missingSkills) {
  if (missingSkills.length === 0) return resumeText;

  const lines = resumeText.split('\n');
  const skillsHeaderIdx = lines.findIndex(l =>
    /^(skills?|навыки|технические\s*навыки|hard\s*skills)/i.test(l.trim())
  );

  const missingStr = missingSkills.join(', ');

  if (skillsHeaderIdx !== -1) {
    // Find first non-empty line after header and append to it
    let insertIdx = skillsHeaderIdx + 1;
    while (insertIdx < lines.length && lines[insertIdx].trim() === '') insertIdx++;

    if (insertIdx < lines.length) {
      // Append to existing skills line
      lines[insertIdx] = lines[insertIdx].trimEnd() + (lines[insertIdx].trim() ? ', ' : '') + missingStr;
    } else {
      lines.push(missingStr);
    }
    return lines.join('\n');
  }

  // No skills section found — append one
  return resumeText.trimEnd() + '\n\nSkills\n' + missingStr;
}

function parseResumeStructure(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sections = {};
  let current = 'general';
  const headerRe = /^(skills?|навыки|опыт|experience|education|образование|contacts?|контакты|summary|about|обо\s*мне|projects?|проекты)/i;

  for (const line of lines) {
    if (headerRe.test(line)) {
      current = line.toLowerCase().replace(/\s+/g, '_');
      sections[current] = [];
    } else {
      if (!sections[current]) sections[current] = [];
      sections[current].push(line);
    }
  }
  return sections;
}

async function extractTextFromFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: file.path });
    return result.value;
  }
  if (ext === '.txt') {
    return fs.readFileSync(file.path, 'utf-8');
  }
  throw new Error('Unsupported file type: ' + ext);
}

router.post('/', upload.fields([{ name: 'jobFile' }, { name: 'resumeFile' }]), async (req, res) => {
  try {
    let jobText = req.body.jobText || '';
    let resumeText = req.body.resumeText || '';

    if (req.files?.jobFile?.[0]) {
      jobText = await extractTextFromFile(req.files.jobFile[0]);
    }
    if (req.files?.resumeFile?.[0]) {
      resumeText = await extractTextFromFile(req.files.resumeFile[0]);
    }

    if (!jobText || !resumeText) {
      return res.status(400).json({ error: 'Необходимо загрузить вакансию и резюме' });
    }

    // 1. Extract skills
    const jobSkills = extractSkills(jobText);          // scan full job description
    const resumeSkills = extractResumeSkills(resumeText); // scan only Skills section
    const jobRuReqs = extractRuRequirements(jobText);

    // 2. Match — exact canonical comparison
    const { matched, missing } = matchSkills(jobSkills, resumeSkills);

    // 3. Build adapted resume
    const adaptedResume = buildAdaptedResume(resumeText, missing);

    const matchScore = jobSkills.length > 0
      ? Math.round((matched.length / jobSkills.length) * 100)
      : 0;

    // 4. Save to Supabase
    if (supabase) {
      await supabase.from('vacancies').insert({
        description: jobText.slice(0, 5000),
        skills_required: jobSkills.join(', '),
      });
      await supabase.from('resumes').insert({
        skills: resumeSkills.join(', '),
        adapted_text: adaptedResume.slice(0, 10000),
        match_score: matchScore,
      });
    }

    // Cleanup
    for (const key of Object.keys(req.files || {})) {
      for (const f of req.files[key]) fs.unlink(f.path, () => {});
    }

    res.json({
      jobSkills,
      resumeSkills,
      jobRuReqs,
      matched,
      missing,
      matchScore,
      resumeSections: Object.keys(parseResumeStructure(resumeText)),
      adaptedResume,
      originalResume: resumeText,
      jobText,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
