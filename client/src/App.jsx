import React, { useState, useEffect } from 'react';
import UploadStep from './components/UploadStep';
import AnalysisStep from './components/AnalysisStep';
import ReviewStep from './components/ReviewStep';
import DownloadStep from './components/DownloadStep';
import AuthStep from './components/AuthStep';
import { supabase } from './lib/supabase';

const STEPS = [
  { id: 0, label: 'Upload' },
  { id: 1, label: 'Analysis' },
  { id: 2, label: 'Review' },
  { id: 3, label: 'Download' },
];

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold border-2 transition-all duration-300 ${
                step > s.id
                  ? 'bg-emerald-400 border-emerald-400 text-ink'
                  : step === s.id
                  ? 'bg-violet-600 border-violet-400 text-white'
                  : 'bg-transparent border-[#2a2a4a] text-slate-600'
              }`}
            >
              {step > s.id ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.id + 1
              )}
            </div>
            <span className={`text-xs whitespace-nowrap transition-colors ${
              step >= s.id ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 mb-4 transition-all duration-500 ${
              step > s.id ? 'bg-emerald-400' : 'bg-[#2a2a4a]'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(-1);
  const [token, setToken] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);

  useEffect(() => {
    // Check for an existing valid session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        setStep(0);
      }
      setSessionLoading(false);
    });

    // Poll usage every 60 s while logged in
    let usageInterval = null;
    const fetchUsage = (tok) => {
      fetch('/api/usage', { headers: { Authorization: `Bearer ${tok}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUsageData(d); })
        .catch(() => {});
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUsage(session.access_token);
        usageInterval = setInterval(() => fetchUsage(session.access_token), 60_000);
      }
    });

    // Listen for auth state changes — handles expiry and sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        setToken(null);
        setStep(-1);
        setAnalysisData(null);
        setFinalData(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setToken(session.access_token);
      } else if (event === 'SIGNED_IN' && session) {
        setToken(session.access_token);
        setStep(0);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (usageInterval) clearInterval(usageInterval);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will fire SIGNED_OUT and reset state
  };

  const handleAnalysisDone = (data) => {
    if (data.usage) setUsageData(data.usage);
    setAnalysisData(data);
    setStep(1);
  };

  const handleReviewDone = (data) => {
    setFinalData(data);
    setStep(3);
  };

  const handleRestart = () => {
    setStep(0);
    setAnalysisData(null);
    setFinalData(null);
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <header className="mb-10 fade-up">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h1 className="font-display text-2xl text-slate-100 tracking-tight">
                Resume<span className="text-violet-400">AI</span>
              </h1>
            </div>

            {token && (
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            )}
          </div>
          <div className="flex items-center justify-between ml-12">
            <p className="text-slate-500 text-sm">
              Adapt your resume to any job in seconds
            </p>
            {token && usageData && (
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-xs font-mono ${usageData.blocked ? 'text-rose-400' : usageData.percentRemaining <= 25 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {usageData.blocked ? 'quota exhausted' : `${usageData.analysesLeft} / ${usageData.analysesTotal} analyses`}
                </span>
                <div className="w-24 h-1 rounded-full bg-[#2a2a4a] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usageData.blocked ? 'bg-rose-500' : usageData.percentRemaining <= 25 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${usageData.percentRemaining}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="mb-8 fade-up fade-up-delay-1">
          <ProgressBar step={step} />
        </div>

        <main className="fade-up-delay-2">
          {step === -1 && (
            <AuthStep onAuthSuccess={(t) => { setToken(t); setStep(0); }} />
          )}

          {step >= 0 && (
            <>
              {step === 0 && <UploadStep onNext={handleAnalysisDone} token={token} quotaBlocked={usageData?.blocked} />}
              {step === 1 && analysisData && (
                <AnalysisStep
                  data={analysisData}
                  onNext={() => setStep(2)}
                  onBack={() => setStep(0)}
                  token={token}
                />
              )}
              {step === 2 && analysisData && (
                <ReviewStep
                  data={analysisData}
                  onNext={handleReviewDone}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && finalData && (
                <DownloadStep
                  data={finalData}
                  onRestart={handleRestart}
                  token={token}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
