import React, { useState } from 'react';

export default function ReviewStep({ data, onNext, onBack }) {
  const [resumeText, setResumeText] = useState(data.adaptedResume);
  const [name, setName] = useState('');

  return (
    <div className="fade-up flex flex-col gap-6">
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-display text-xl text-slate-100">Adapted Resume Preview</h3>
          {data.missing.length > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              +{data.missing.length} skills added
            </span>
          )}
        </div>

        {data.missing.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
            <span className="text-xs text-violet-400 font-medium w-full mb-1">Added by AI:</span>
            {data.missing.map(skill => (
              <span key={skill} className="skill-badge skill-neutral">{skill}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 uppercase tracking-wider">Your name for PDF header</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name (optional)"
            className="bg-[#0d0d1f] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 uppercase tracking-wider">Resume text (editable)</label>
          <textarea
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            className="w-full h-80 bg-[#0d0d1f] border border-[#2a2a4a] rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-violet-500 transition-colors font-mono leading-relaxed"
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 text-slate-400 hover:text-slate-200 border border-[#2a2a4a] hover:border-[#4a4a7a] rounded-xl transition-all text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>
        <button
          onClick={() => onNext({ ...data, adaptedResume: resumeText, name })}
          className="btn-primary flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
        >
          Generate PDF
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
