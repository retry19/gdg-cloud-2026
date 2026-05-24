import React, { useState } from 'react';
import { UploadCloud, FileText, Activity, Briefcase, Wand2, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Analytics } from '@vercel/analytics/react';

interface FitResult {
  overallFitScore: number;
  skillsFit: number;
  expFit: number;
  eduFit: number;
  gaps: { type: string; text: string }[];
  recommendations: string[];
}

interface ImprovedSection {
  sectionTitle: string;
  original: string;
  improved: string;
}

interface AutofixResult {
  improvedSections: ImprovedSection[];
  summary: string;
}

function App() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FitResult | null>(null);
  const [error, setError] = useState('');
  const [autofixResult, setAutofixResult] = useState<AutofixResult | null>(null);
  const [autofixLoading, setAutofixLoading] = useState(false);
  const [autofixError, setAutofixError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!cvFile || !jdText || jdText.length < 100) {
      setError('Please upload a CV and paste a Job Description (min 100 chars).');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      formData.append('jd', jdText);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFix = async () => {
    if (!cvFile || !result) return;
    setAutofixError('');
    setAutofixLoading(true);
    setAutofixResult(null);

    try {
      const cvText = await cvFile.text();
      const response = await fetch('/api/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText, analysis: result }),
      });

      if (!response.ok) throw new Error('Auto-fix failed.');

      const data = await response.json();
      setAutofixResult(data);
    } catch (err) {
      console.error(err);
      setAutofixError('An error occurred during auto-fix. Please try again.');
    } finally {
      setAutofixLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Analytics />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Briefcase size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              JMF Analyzer
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">Job Market Fit Intelligence</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Section (Left) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <UploadCloud className="mr-2 text-blue-500" size={20} />
              1. Upload Your CV
            </h2>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
              <input 
                type="file" 
                accept=".pdf,.docx,.txt" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none flex flex-col items-center">
                <FileText className="text-slate-400 mb-3" size={32} />
                <p className="text-sm font-medium text-slate-700">
                  {cvFile ? cvFile.name : "Drag & drop or click to upload"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT (Max 5MB)</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="mr-2 text-indigo-500" size={20} />
              2. Paste Job Description
            </h2>
            <textarea
              className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              placeholder="Paste the full job description here (minimum 100 characters)..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <div className="flex justify-between items-center mt-2">
              <span className={clsx("text-xs font-medium", jdText.length < 100 ? "text-red-500" : "text-green-600")}>
                {jdText.length} / 100 chars minimum
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <>
                <Activity className="animate-spin mr-2" size={20} />
                Analyzing Fit...
              </>
            ) : (
              'Calculate Fit Score'
            )}
          </button>
        </section>

        {/* Analytics Section (Right) */}
        <section className="lg:col-span-7">
          {!result && !loading ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Activity size={48} className="mb-4 text-slate-300" />
              <p className="text-lg font-medium">Ready to analyze your fit</p>
              <p className="text-sm mt-2 text-center max-w-xs">Upload your CV and a Job Description to get started.</p>
            </div>
          ) : loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-64 bg-slate-200 rounded-3xl"></div>
              <div className="h-32 bg-slate-200 rounded-2xl"></div>
              <div className="h-48 bg-slate-200 rounded-2xl"></div>
            </div>
          ) : result ? (
            <AnalyticsDashboard
              result={result}
              onAutoFix={handleAutoFix}
              autofixLoading={autofixLoading}
              autofixResult={autofixResult}
              autofixError={autofixError}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function AnalyticsDashboard({ result, onAutoFix, autofixLoading, autofixResult, autofixError }: {
  result: FitResult;
  onAutoFix: () => void;
  autofixLoading: boolean;
  autofixResult: AutofixResult | null;
  autofixError: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 76) return 'text-brand-green';
    if (score >= 51) return 'text-brand-yellow';
    return 'text-brand-red';
  };
  const getScoreStroke = (score: number) => {
    if (score >= 76) return 'stroke-brand-green';
    if (score >= 51) return 'stroke-brand-yellow';
    return 'stroke-brand-red';
  };
  
  const scoreLabel = result.overallFitScore >= 76 ? 'Great Match!' : result.overallFitScore >= 51 ? 'Fair Match' : 'Low Match';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Score Donut */}
        <div className="col-span-1 md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-100 fill-none"
                strokeWidth="3"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={clsx("fill-none transition-all duration-1000 ease-out", getScoreStroke(result.overallFitScore))}
                strokeWidth="3"
                strokeDasharray={`${result.overallFitScore}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={clsx("text-3xl font-black", getScoreColor(result.overallFitScore))}>
                {result.overallFitScore}%
              </span>
            </div>
          </div>
          <h3 className="mt-4 font-semibold text-slate-800 text-center">{scoreLabel}</h3>
        </div>

        {/* Sub Scores */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
            <ScoreCard title="Skills Match" score={result.skillsFit} />
            <ScoreCard title="Experience Match" score={result.expFit} />
            <ScoreCard title="Education Match" score={result.eduFit} className="col-span-2" />
        </div>
      </div>

      {/* Auto-Fix Button */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Wand2 size={18} className="mr-2 text-emerald-500" /> Auto-Fix CV
            </h3>
            <p className="text-sm text-slate-500 mt-1">AI rewrites your CV sections based on the feedback below.</p>
          </div>
          <button
            onClick={onAutoFix}
            disabled={autofixLoading}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-70 flex items-center shrink-0"
          >
            {autofixLoading ? (
              <>
                <Activity className="animate-spin mr-2" size={18} />
                Fixing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2" size={18} />
                Auto-Fix CV
              </>
            )}
          </button>
        </div>
        {autofixError && (
          <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
            {autofixError}
          </div>
        )}
      </div>

      {/* Auto-Fix Results */}
      {autofixResult && <AutoFixResult data={autofixResult} />}

      {/* Gaps List */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Key Gaps Identified</h3>
        <ul className="space-y-3">
          {result.gaps.map((gap, i) => (
            <li key={i} className="flex items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
               <span className={clsx(
                 "shrink-0 px-2 py-1 text-[10px] uppercase font-bold rounded-md mr-3 mt-0.5",
                 gap.type === 'Critical' ? 'bg-red-100 text-red-700' : 
                 gap.type === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
               )}>
                 {gap.type}
               </span>
               <span className="text-sm font-medium text-slate-700">{gap.text}</span>
            </li>
          ))}
          {result.gaps.length === 0 && (
            <li className="text-sm text-slate-500 italic">No significant gaps found!</li>
          )}
        </ul>
      </div>

      {/* Recommendations List */}
      <div className="bg-indigo-50 p-6 rounded-3xl shadow-sm border border-indigo-100 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-200/50 rounded-full blur-3xl pointer-events-none"></div>
        <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-200/50 pb-3 flex items-center">
          <Activity size={18} className="mr-2" /> Actionable Enhancements
        </h3>
        <ul className="space-y-4 relative z-10">
          {result.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start">
               <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3 mt-0.5">
                 {i + 1}
               </div>
               <p className="text-sm text-indigo-900 leading-relaxed font-medium">{rec}</p>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

function AutoFixResult({ data }: { data: AutofixResult }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary */}
      <div className="bg-emerald-50 p-6 rounded-3xl shadow-sm border border-emerald-100 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-200/50 rounded-full blur-3xl pointer-events-none"></div>
        <h3 className="text-lg font-bold text-emerald-900 mb-2 flex items-center relative z-10">
          <Wand2 size={18} className="mr-2" /> Changes Summary
        </h3>
        <p className="text-sm text-emerald-800 leading-relaxed font-medium relative z-10">{data.summary}</p>
      </div>

      {/* Before/After Sections */}
      {data.improvedSections.map((section, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h4 className="text-base font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">{section.sectionTitle}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">Original</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {section.original}
              </div>
            </div>
            {/* Improved */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Improved</span>
                <button
                  onClick={() => handleCopy(section.improved, i)}
                  className="flex items-center text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {copiedIdx === i ? (
                    <><Check size={14} className="mr-1" /> Copied</>
                  ) : (
                    <><Copy size={14} className="mr-1" /> Copy</>
                  )}
                </button>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {section.improved}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreCard({ title, score, className }: { title: string, score: number, className?: string }) {
  const isHigh = score >= 80;
  const isMed = score >= 50 && score < 80;
  
  return (
    <div className={twMerge("bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center", className)}>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
      <div className="flex items-end space-x-2">
        <span className={clsx(
          "text-2xl font-black",
          isHigh ? "text-brand-green" : isMed ? "text-brand-yellow" : "text-brand-red"
        )}>
          {score}%
        </span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
        <div 
          className={clsx("h-full rounded-full transition-all duration-1000", isHigh ? "bg-brand-green" : isMed ? "bg-brand-yellow" : "bg-brand-red")} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default App;
