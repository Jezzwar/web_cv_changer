import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

const INPUT_STYLE = {
  width: '100%',
  background: '#0a0a1580',
  border: '2px solid #ffffff30',
  borderRadius: '10px',
  padding: '12px',
  color: '#ffffff',
  fontSize: '13px',
  fontFamily: 'monospace',
  lineHeight: '1.6',
  outline: 'none',
  boxSizing: 'border-box',
};

function FileUpload({ label, showUrlMode, onFile, onText, onUrl, file, text }) {
  const modes = showUrlMode ? ['file', 'url', 'text'] : ['file', 'text'];
  const [mode, setMode] = useState('file');
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    onDrop: (accepted) => { if (accepted[0]) onFile(accepted[0]); },
  });

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    try {
      const res = await fetch('/api/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUrl(data.text, data.title);
    } catch (e) {
      setUrlError(e.message);
    } finally {
      setUrlLoading(false);
    }
  };

  const modeLabels = { file: 'File', url: 'URL', text: 'Text' };

  return (
    <div style={{ border: '1px solid #ffffff40', borderRadius: '12px', padding: '20px', background: '#12121f', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '15px' }}>{label}</span>
        <div style={{ display: 'flex', gap: '4px', background: '#0a0a15', borderRadius: '8px', padding: '3px', border: '1px solid #ffffff20' }}>
          {modes.map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 500, transition: 'all 0.15s',
              background: mode === m ? '#ffffff' : 'transparent',
              color: mode === m ? '#0a0a15' : '#ffffff80',
            }}>
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* File drop zone */}
      {mode === 'file' && (
        <div {...getRootProps()} style={{
          border: `2px dashed ${file ? '#4ade80' : isDragActive ? '#ffffff' : '#ffffff40'}`,
          borderRadius: '10px', padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
          background: file ? '#4ade8010' : isDragActive ? '#ffffff08' : '#0a0a1580',
          transition: 'all 0.2s',
        }}>
          <input {...getInputProps()} />
          {file ? (
            <>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
              <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '14px', margin: 0 }}>{file.name}</p>
              <p style={{ color: '#ffffff50', fontSize: '12px', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB · click to change</p>
            </>
          ) : isDragActive ? (
            <>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>↓</div>
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', margin: 0 }}>Drop file here</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Drag & drop file here or click</p>
              <p style={{ color: '#ffffff60', fontSize: '12px', margin: 0 }}>Supports .txt and .docx</p>
            </>
          )}
        </div>
      )}

      {/* URL input */}
      {mode === 'url' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
              placeholder="https://linkedin.com/jobs/view/..."
              style={{ ...INPUT_STYLE, flex: 1, height: '44px', resize: 'none' }}
              onFocus={e => e.target.style.borderColor = '#ffffff80'}
              onBlur={e => e.target.style.borderColor = '#ffffff30'}
            />
            <button
              onClick={handleFetchUrl}
              disabled={urlLoading || !url.trim()}
              style={{
                padding: '0 16px', height: '44px', borderRadius: '10px', border: 'none',
                background: url.trim() ? '#ffffff' : '#ffffff30',
                color: url.trim() ? '#0a0a15' : '#ffffff60',
                fontWeight: 600, fontSize: '13px', cursor: url.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              {urlLoading ? '...' : 'Загрузить'}
            </button>
          </div>
          {urlError && <p style={{ color: '#fb7185', fontSize: '12px', margin: 0 }}>{urlError}</p>}
          <p style={{ color: '#ffffff40', fontSize: '11px', margin: 0 }}>
            Supports: LinkedIn, Indeed, hh.ru, SuperJob and more
          </p>
        </div>
      )}

      {/* Text input */}
      {mode === 'text' && (
        <textarea
          value={text || ''}
          onChange={e => onText(e.target.value)}
          placeholder={`Paste ${label.toLowerCase()} text here...`}
          style={{ ...INPUT_STYLE, height: '160px', resize: 'vertical' }}
          onFocus={e => e.target.style.borderColor = '#ffffff80'}
          onBlur={e => e.target.style.borderColor = '#ffffff30'}
        />
      )}
    </div>
  );
}

export default function UploadStep({ onNext, token }) {
  const [jobFile, setJobFile] = useState(null);
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJobUrl = (text, title) => {
    setJobText(text);
    setJobTitle(title || '');
    setJobFile(null);
  };

  const canProceed = (jobFile || jobText) && (resumeFile || resumeText);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      if (jobFile) formData.append('jobFile', jobFile);
      else formData.append('jobText', jobText);
      if (resumeFile) formData.append('resumeFile', resumeFile);
      else formData.append('resumeText', resumeText);

      const res = await fetch('/api/analyze', { 
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка анализа');
      onNext(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <FileUpload
          label="Вакансия"
          showUrlMode={true}
          onFile={(f) => { setJobFile(f); setJobText(''); setJobTitle(''); }}
          onText={(t) => { setJobText(t); setJobFile(null); }}
          onUrl={handleJobUrl}
          file={jobFile}
          text={jobText}
        />
        <FileUpload
          label="Резюме"
          showUrlMode={false}
          onFile={(f) => { setResumeFile(f); setResumeText(''); }}
          onText={(t) => { setResumeText(t); setResumeFile(null); }}
          onUrl={() => {}}
          file={resumeFile}
          text={resumeText}
        />
      </div>

      {/* Mobile: stack */}
      <style>{`@media(max-width:640px){.upload-grid{grid-template-columns:1fr!important}}`}</style>

      {error && (
        <div style={{ background: '#fb718520', border: '1px solid #fb718540', borderRadius: '10px', padding: '12px 16px', color: '#fb7185', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleAnalyze}
          disabled={!canProceed || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: canProceed && !loading ? '#ffffff' : '#ffffff30',
            color: canProceed && !loading ? '#0a0a15' : '#ffffff60',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: canProceed && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze →'}
        </button>
      </div>
    </div>
  );
}
