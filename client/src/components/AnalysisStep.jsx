import React from 'react';

function ScoreRing({ score }) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#fb7185';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e1e3a" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="60" y="60" textAnchor="middle" dy="0.35em" fill={color} fontSize="22" fontFamily="JetBrains Mono" fontWeight="500">
          {score}%
        </text>
      </svg>
      <span className="text-slate-400 text-sm">Совпадение</span>
    </div>
  );
}

function SkillBadge({ skill, type }) {
  const classes = {
    match: 'skill-badge skill-match',
    missing: 'skill-badge skill-missing',
    neutral: 'skill-badge skill-neutral',
  };
  const icons = {
    match: '✓',
    missing: '✕',
    neutral: '·',
  };
  return (
    <span className={classes[type]}>
      <span>{icons[type]}</span>
      {skill}
    </span>
  );
}

export default function AnalysisStep({ data, onNext, onBack }) {
  const { jobSkills, matched, missing, matchScore } = data;

  return (
    <div className="fade-up flex flex-col gap-6">
      {/* Score header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
        <ScoreRing score={matchScore} />
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-display text-2xl text-slate-100 mb-1">
            {matchScore >= 70 ? 'Отличное совпадение!' : matchScore >= 40 ? 'Есть над чем поработать' : 'Требуется доработка'}
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Ваше резюме покрывает <strong className="text-slate-200">{matched.length}</strong> из{' '}
            <strong className="text-slate-200">{jobSkills.length}</strong> требований вакансии.
            {missing.length > 0 && ` Будет добавлено ${missing.length} недостающих навыков.`}
          </p>
          <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              <span className="text-slate-400">Совпадает: <strong className="text-emerald-400">{matched.length}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
              <span className="text-slate-400">Отсутствует: <strong className="text-rose-400">{missing.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            Требования вакансии
          </h4>
          <div className="flex flex-wrap gap-2">
            {jobSkills.length === 0 && <p className="text-slate-500 text-sm">Навыки не обнаружены</p>}
            {jobSkills.map(skill => (
              <SkillBadge
                key={skill}
                skill={skill}
                type={matched.includes(skill) ? 'match' : 'missing'}
              />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            Недостающие навыки
          </h4>
          {missing.length === 0 ? (
            <p className="text-emerald-400 text-sm">Все навыки из вакансии уже есть в вашем резюме!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missing.map(skill => (
                <SkillBadge key={skill} skill={skill} type="missing" />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 text-slate-400 hover:text-slate-200 border border-[#2a2a4a] hover:border-[#4a4a7a] rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Назад
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
        >
          Просмотреть резюме
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
