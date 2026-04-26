import React, { useState, useEffect } from 'react';

export default function DownloadStep({ data, onRestart, token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => { generatePdf(); }, []);

  const generatePdf = async () => {
    setLoading(true);
    setError('');
    setPdfUrl(null);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeText: data.adaptedResume,
          addedSkills: data.missing,
        }),
      });
      if (!res.ok) {
        let msg = 'PDF generation failed';
        try { const e = await res.json(); msg = e.error || msg; } catch { /* empty body */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up flex flex-col items-center gap-8 py-8">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-violet-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Generating PDF...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-400/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-rose-400 text-sm">{error}</p>
          <button onClick={generatePdf} className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-400/30 rounded-lg text-sm hover:bg-rose-500/30 transition-all">
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-400/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full bg-emerald-400/5 animate-ping" style={{ animationDuration: '2s' }} />
          </div>

          <div className="text-center">
            <h3 className="font-display text-2xl text-slate-100 mb-2">PDF is ready!</h3>
            <p className="text-slate-400 text-sm">
              Your resume has been adapted and is ready to download.
              {data.missing.length > 0 && ` ${data.missing.length} skills were added.`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            { [
              { label: 'Match', value: `${data.matchScore}%`, color: 'text-violet-400' },
              { label: 'Added', value: data.missing.length, color: 'text-emerald-400' },
              { label: 'Required', value: data.jobSkills.length, color: 'text-cyan-400' },
            ].map(stat => (
              <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
                <div className={`font-mono text-xl font-semibold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {data.adaptChanges?.length > 0 && (
            <div className="w-full glass-card rounded-xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                What was changed
              </h4>
              <div className="flex flex-col gap-3">
                {data.adaptChanges.map((change, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
                        {change.section}
                      </span>
                      {change.position && (
                        <span className="text-xs text-slate-500">— {change.position}</span>
                      )}
                    </div>
                    <ul className="flex flex-col gap-0.5 pl-3">
                      {change.added.map((item, j) => (
                        <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <a
            href={pdfUrl}
            download="adapted_resume.pdf"
            className="btn-primary w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>

          <button onClick={onRestart} className="text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Adapt another resume
          </button>
        </div>
      )}
    </div>
  );
}
