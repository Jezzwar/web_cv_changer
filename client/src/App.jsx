import React, { useState } from 'react';
import UploadStep from './components/UploadStep';
import AnalysisStep from './components/AnalysisStep';
import ReviewStep from './components/ReviewStep';
import DownloadStep from './components/DownloadStep';

const STEPS = [
  { id: 0, label: 'Загрузка' },
  { id: 1, label: 'Анализ' },
  { id: 2, label: 'Просмотр' },
  { id: 3, label: 'Скачать' },
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
  const [step, setStep] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [finalData, setFinalData] = useState(null);

  const handleAnalysisDone = (data) => {
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

  return (
    <div className="min-h-screen relative">
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-10 fade-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-slate-100 tracking-tight">
              Resume<span className="text-violet-400">AI</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Адаптация резюме под вакансию за секунды
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8 fade-up fade-up-delay-1">
          <ProgressBar step={step} />
        </div>

        {/* Step content */}
        <main className="fade-up-delay-2">
          {step === 0 && <UploadStep onNext={handleAnalysisDone} />}
          {step === 1 && analysisData && (
            <AnalysisStep
              data={analysisData}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
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
            />
          )}
        </main>
      </div>
    </div>
  );
}
