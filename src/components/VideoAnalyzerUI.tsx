import React, { useState } from 'react';
import { analyzeVideoForClips, SupportedGeminiModel } from '../utils/gemini';

export default function VideoAnalyzerUI() {
  const [model, setModel] = useState<SupportedGeminiModel>("gemini-3.5-flash");
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const modelOptions: { label: string; value: SupportedGeminiModel }[] = [
    { label: "Gemini 3.5 Flash (Recommended)", value: "gemini-3.5-flash" },
    { label: "Gemini 3.1 Pro (Heavy Reasoning)", value: "gemini-3.1-pro-preview" },
    { label: "Gemini 3.1 Flash-Lite (Budget/Speed)", value: "gemini-3.1-flash-lite" },
    { label: "Gemini 2.5 Pro (Legacy Stable)", value: "gemini-2.5-pro" },
    { label: "Gemini 2.5 Flash (Legacy)", value: "gemini-2.5-flash" },
  ];

  const handleAnalyze = async (filePath: string) => {
    setStatus('processing');
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
      await analyzeVideoForClips(apiKey, filePath, model);
      setStatus('success');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">
        AI Engine
      </label>
      <select 
        value={model} 
        onChange={(e) => setModel(e.target.value as SupportedGeminiModel)}
        className="w-full bg-black/30 text-white rounded-lg p-3 border border-white/10 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {modelOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <button 
        onClick={() => handleAnalyze('my-video.mp4')}
        disabled={status === 'processing'}
        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition"
      >
        {status === 'processing' ? 'Processing...' : 'Run Analysis'}
      </button>
    </div>
  );
}