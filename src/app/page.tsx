"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SupportedGeminiModel } from "@/utils/gemini";

interface ClipItem {
  title: string;
  hookDescription: string;
  startTime: string;
  endTime: string;
  suggestedSubtitleCaption: string;
  viralityScore: number;
}

export default function DashboardPage() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Interface Drop-Down Selection State
  const [selectedModel, setSelectedModel] = useState<SupportedGeminiModel>("gemini-3.5-flash");
  
  // Stateful Processing Steps
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<"uploading" | "analyzing" | "rendering" | "idle">("idle");
  
  // Main Data States with Explicit Initialization Arrays to Prevent Reading Properties of Undefined
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const key = localStorage.getItem("clipforge_gemini_key");
    setHasKey(!!key);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
        setClips([]);
        setVideoUrls([]);
      } else {
        alert("Please drop a valid video file container.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setClips([]);
      setVideoUrls([]);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = localStorage.getItem("clipforge_gemini_key");
    
    if (!key) {
      alert("Please configure your Gemini API Key in Settings first.");
      return;
    }
    if (!selectedFile) {
      alert("Please select a source footage file first.");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("uploading");

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      setTimeout(() => setProcessingStep("analyzing"), 1500);

      const response = await fetch("/api/process", {
        method: "POST",
        headers: { 
          "x-gemini-key": key,
          "x-gemini-model": selectedModel
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse system response structures.");
      }

      setProcessingStep("rendering");
      const data = await response.json();
      
      // Strict fallback operators guarantee arrays are never set to undefined
      setClips(data?.meta || data?.clips || []);
      setVideoUrls(data?.urls || []);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An unexpected orchestration error occurred.");
      setClips([]);
      setVideoUrls([]);
    } finally {
      setIsProcessing(false);
      setProcessingStep("idle");
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30">
      {/* Header Panel */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold tracking-tight text-lg text-white hover:opacity-90">
            Clip<span className="text-indigo-400">Forge</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-zinc-400">{hasKey ? "API Connected" : "API Missing"}</span>
            </div>
            <Link 
              href="/dashboard/settings" 
              className="text-sm text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 px-4 py-1.5 rounded-lg transition-all"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      {/* Primary Workspace Layout */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Workspace Hub
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Drop your long-form gaming or podcast footage to generate vertical content blocks instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Controls Workspace Card */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleProcess} className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative group border-2 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center transition-all ${
                  dragActive 
                    ? "border-indigo-500 bg-indigo-500/5" 
                    : selectedFile 
                      ? "border-zinc-700 bg-zinc-900/20" 
                      : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/10"
                }`}
              >
                <input
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none"
                  disabled={isProcessing}
                />
                <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 mb-4 group-hover:scale-105 transition-transform">
                  <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      Drag & drop your local video file, or <span className="text-indigo-400">browse</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Supports MP4, MOV, or MKV containers</p>
                  </div>
                )}
              </div>

              {/* State Machine Action Button */}
              <button
                type="submit"
                disabled={!selectedFile || isProcessing}
                className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-lg disabled:bg-zinc-900 disabled:text-zinc-600 flex items-center justify-center gap-3"
              >
                {isProcessing && (
                  <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {processingStep === "idle" && "Analyze & Forge Vertical Clips"}
                {processingStep === "uploading" && "Uploading Master Asset..."}
                {processingStep === "analyzing" && `Gemini AI (${selectedModel}) Analyzing...`}
                {processingStep === "rendering" && "FFmpeg Compiling 9:16 Streams..."}
              </button>
            </form>
          </div>

          {/* Context Options Sheet */}
          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300">Orchestration Defaults</h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-zinc-900/60 pb-3 items-center">
                <span className="text-zinc-500">Target Framework</span>
                <span className="text-zinc-300 font-mono">9:16 Render Bounding</span>
              </div>
              
              {/* Highlighted Visual Drop-Down Selector Container */}
              <div className="flex flex-col gap-2 border-b border-zinc-900/60 pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">LLM Processing Model</span>
                  <span className="text-[10px] bg-indigo-950/60 border border-indigo-900/80 text-indigo-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">Engine</span>
                </div>
                <div className="relative">
                  <select
                    value={selectedModel}
                    disabled={isProcessing}
                    onChange={(e) => setSelectedModel(e.target.value as SupportedGeminiModel)}
                    className="w-full bg-zinc-900 text-zinc-200 font-medium font-sans border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none shadow-sm"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (Recommended)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pb-1 items-center">
                <span className="text-zinc-500">Hardware Accelerator</span>
                <span className="text-zinc-300 font-mono">Local FFmpeg Core</span>
              </div>
            </div>
          </div>
        </div>

        {/* Output Grid View Block */}
        {Array.isArray(clips) && clips.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-zinc-900">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Generated Viral Clips</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Review, copy captions, and download your finalized short-form crops.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clips.map((clip, index) => (
                <div key={index} className="border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden backdrop-blur-md flex flex-col justify-between">
                  <div className="relative aspect-[9/16] bg-black border-b border-zinc-900">
                    {videoUrls[index] ? (
                      <video src={videoUrls[index]} controls className="w-full h-full object-cover" preload="metadata" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs font-mono bg-zinc-950">
                        Render Asset Generating...
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold font-mono text-indigo-400 shadow-md">
                      SCORE: {clip?.viralityScore || 0}/100
                    </div>
                  </div>

                  <div className="p-4 space-y-3 bg-zinc-950/40 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Clip #{index + 1}</span>
                        <span>{clip?.startTime || "00:00"} - {clip?.endTime || "00:00"}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-200 line-clamp-1">{clip?.title || "Untitled Fragment"}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{clip?.hookDescription || "No sequence details supplied."}</p>
                    </div>

                    <div className="pt-2 border-t border-zinc-900 space-y-2">
                      <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 relative group/caption">
                        <p className="text-[11px] text-zinc-300 font-medium italic leading-relaxed pr-6">
                          "{clip?.suggestedSubtitleCaption || "No subtitle mapped."}"
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(clip?.suggestedSubtitleCaption || "", index)}
                          className="absolute top-2 right-2 opacity-0 group-hover/caption:opacity-100 text-zinc-500 hover:text-white transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(clip?.suggestedSubtitleCaption || "", index)}
                        className="w-full py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[11px] font-medium rounded-md transition-all text-zinc-300 flex items-center justify-center gap-1.5"
                      >
                        {copiedIndex === index ? "Copied! ✓" : "Copy Subtitle String"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}