"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SupportedGeminiModel = "gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite" | "gemini-2.5-pro" | "gemini-2.5-flash";
type TargetAspectRatio = "9:16" | "1:1" | "16:9";
type TargetQuality = "1080" | "720" | "480" | "360";

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
  const [youtubeUrl, setYoutubeUrl] = useState("");
  
  const [selectedModel, setSelectedModel] = useState<SupportedGeminiModel>("gemini-3.5-flash");
  const [aspectRatio, setAspectRatio] = useState<TargetAspectRatio>("9:16");
  const [videoQuality, setVideoQuality] = useState<TargetQuality>("1080");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveStreamLogs, setLiveStreamLogs] = useState<any[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const key = localStorage.getItem("clipforge_gemini_key");
    setHasKey(!!key);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (youtubeUrl.trim()) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setSelectedFile(file); setClips([]); setVideoUrls([]); setPipelineError(null);
      } else { alert("Please drop a valid video file."); }
    }
  };

  // FIX 1: Implemented missing handleFileChange controller function
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setClips([]);
      setVideoUrls([]);
      setPipelineError(null);
    }
  };

  // FIX 2: Implemented missing copyToClipboard handling function
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = localStorage.getItem("clipforge_gemini_key");
    if (!key) { alert("Configure your Gemini API Key in Settings first."); return; }
    if (!selectedFile && !youtubeUrl.trim()) { alert("Provide a local file or paste a YouTube link."); return; }

    setIsProcessing(true);
    setPipelineError(null);
    setClips([]);
    setVideoUrls([]);
    setLiveStreamLogs([]);

    const formData = new FormData();
    if (youtubeUrl.trim()) formData.append("youtubeUrl", youtubeUrl.trim());
    else if (selectedFile) formData.append("video", selectedFile);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { 
          "x-gemini-key": key,
          "x-gemini-model": selectedModel,
          "x-video-ratio": aspectRatio,
          "x-video-quality": videoQuality
        },
        body: formData,
      });

      if (!response.body) throw new Error("Processing pipeline refused streaming initialization response connection.");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bufferString = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        bufferString += decoder.decode(value, { stream: true });
        const statusLines = bufferString.split("\n");
        bufferString = statusLines.pop() || "";

        for (const line of statusLines) {
          if (!line.trim()) continue;
          const parsedChunk = JSON.parse(line);

          setLiveStreamLogs((prev) => [parsedChunk, ...prev]);

          if (parsedChunk.status === "failed") {
            throw new Error(parsedChunk.error || "An unhandled error occurred inside the engine.");
          }
          if (parsedChunk.status === "success" && parsedChunk.stage === "complete") {
            setClips(parsedChunk.meta || []);
            setVideoUrls(parsedChunk.urls || []);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setPipelineError(err.message || "An unexpected processing error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30">
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold tracking-tight text-lg text-white">
            Clip<span className="text-indigo-400">Forge</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-zinc-400">{hasKey ? "API Connected" : "API Missing"}</span>
            </div>
            <Link href="/dashboard/settings" className="text-sm text-zinc-400 border border-zinc-800 bg-zinc-900/40 px-4 py-1.5 rounded-lg">
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">Workspace Hub</h1>
          <p className="text-zinc-400 text-sm mt-1">Provide a YouTube link or drop media files to pull viral highlights instantly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleProcess} className="space-y-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Option A: Stream Source Link</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  disabled={isProcessing}
                  onChange={(e) => { setYoutubeUrl(e.target.value); if (e.target.value.trim()) setSelectedFile(null); }}
                  className="w-full bg-zinc-900/40 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none transition-all"
                />
              </div>

              <div className="relative flex py-1 items-center text-[10px] text-zinc-700 font-bold justify-center uppercase tracking-widest select-none">
                <div className="flex-grow border-t border-zinc-900/60"></div><span className="mx-4">OR</span><div className="flex-grow border-t border-zinc-900/60"></div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Option B: Drop Asset Binary</label>
                <div
                  onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                  className={`relative group border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                    youtubeUrl.trim() ? "opacity-20 border-zinc-900 cursor-not-allowed pointer-events-none" : dragActive ? "border-indigo-500 bg-indigo-500/5" : selectedFile ? "border-zinc-700 bg-zinc-900/20" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/10"
                  }`}
                >
                  <input
                    type="file" id="video-upload" accept="video/*" disabled={isProcessing || !!youtubeUrl.trim()}
                    onChange={(e) => { handleFileChange(e); if (e.target.files?.[0]) setYoutubeUrl(""); }}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none"
                  />
                  <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-3 group-hover:scale-105 transition-transform">
                    <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  {selectedFile ? (
                    <div><p className="text-xs font-semibold text-white">{selectedFile.name}</p><p className="text-[10px] text-zinc-500 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p></div>
                  ) : ( <p className="text-xs font-medium text-zinc-400">Drag & drop file here, or <span className="text-indigo-400">browse</span></p> )}
                </div>
              </div>

              <button
                type="submit" disabled={(!selectedFile && !youtubeUrl.trim()) || isProcessing}
                className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-lg disabled:bg-zinc-900 disabled:text-zinc-600 flex items-center justify-center gap-3"
              >
                {isProcessing && (
                  <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isProcessing ? "Streaming System Telemetry..." : `Analyze & Forge ${aspectRatio} Clips`}
              </button>
            </form>

            {isProcessing && liveStreamLogs.length > 0 && (
              <div className="border border-indigo-500/30 bg-zinc-950 rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/5">
                <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider text-indigo-400 font-mono uppercase">Live System Telemetry Feed</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600">ndjson_stream_active</span>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto font-mono text-[11px] space-y-2 text-zinc-400 flex flex-col-reverse select-none bg-zinc-950">
                  {liveStreamLogs.map((log, lIdx) => (
                    <div key={lIdx} className={`p-2 rounded-lg border leading-normal transition-all ${
                      lIdx === 0 ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-300 shadow-sm" : "bg-zinc-900/20 border-zinc-900/40 text-zinc-500"
                    }`}>
                      <span className="text-zinc-600 mr-2">[{log.timestamp?.split("T")[1]?.slice(0, 8)}]</span>
                      <span className="font-bold uppercase text-[10px] bg-zinc-900 px-1 py-0.5 rounded mr-2 border border-zinc-800 text-zinc-400">{log.stage}</span>
                      {JSON.stringify(log)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pipelineError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-xs">
                <span className="font-bold block mb-1">Pipeline Engine Issue:</span>
                {pipelineError}
              </div>
            )}
          </div>

          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300">Orchestration Defaults</h3>
            <div className="space-y-4 text-xs">
              
              <div className="flex flex-col gap-2 border-b border-zinc-900/60 pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">YouTube Target Stream Quality</span>
                  <span className="text-[10px] bg-blue-950/60 border border-blue-900/80 text-blue-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">Stream</span>
                </div>
                <div className="relative">
                  <select
                    value={videoQuality} disabled={isProcessing}
                    onChange={(e) => setVideoQuality(e.target.value as TargetQuality)}
                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="1080">Full HD (1080p Profile)</option>
                    <option value="720">Standard HD (720p Profile)</option>
                    <option value="480">Medium Resolution (480p Profile)</option>
                    <option value="360">Low Data Tier (360p Profile)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-b border-zinc-900/60 pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Output Target Frame</span>
                  <span className="text-[10px] bg-emerald-950/60 border border-emerald-900/80 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">Canvas</span>
                </div>
                <div className="relative">
                  <select
                    value={aspectRatio} disabled={isProcessing}
                    onChange={(e) => setAspectRatio(e.target.value as TargetAspectRatio)}
                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="9:16">Vertical Short Form (9:16)</option>
                    <option value="1:1">Square Content (1:1)</option>
                    <option value="16:9">Landscape Highlights (16:9)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-b border-zinc-900/60 pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">LLM Processing Model</span>
                  <span className="text-[10px] bg-indigo-950/60 border border-indigo-900/80 text-indigo-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">Engine</span>
                </div>
                <div className="relative">
                  <select
                    value={selectedModel} disabled={isProcessing}
                    onChange={(e) => setSelectedModel(e.target.value as SupportedGeminiModel)}
                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
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

        {Array.isArray(clips) && clips.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-zinc-900">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Generated Viral Clips</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Review, copy captions, and download your finalized short-form crops.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clips.map((clip, index) => (
                <div key={index} className="border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden backdrop-blur-md flex flex-col justify-between">
                  <div className={`relative bg-black border-b border-zinc-900 flex items-center justify-center ${
                    aspectRatio === "9:16" ? "aspect-[9/16]" : aspectRatio === "1:1" ? "aspect-square" : "aspect-video"
                  }`}>
                    {videoUrls[index] ? (
                      <video src={videoUrls[index]} controls className="w-full h-full object-cover" preload="auto" playsInline />
                    ) : (
                      <div className="text-zinc-600 text-xs font-mono p-4 text-center">Processing video timeline track...</div>
                    )}
                    <div className="absolute top-3 right-3 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold font-mono text-indigo-400 shadow-md">
                      SCORE: {clip?.viralityScore || 0}/100
                    </div>
                  </div>

                  <div className="p-4 space-y-3 bg-zinc-950/40 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Clip #{index + 1} ({aspectRatio})</span>
                        <span>{clip?.startTime} - {clip?.endTime}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-200 line-clamp-1">{clip?.title}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{clip?.hookDescription}</p>
                    </div>

                    <div className="pt-2 border-t border-zinc-900 space-y-2">
                      <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 relative group/caption">
                        <p className="text-[11px] text-zinc-300 font-medium italic leading-relaxed pr-6">"{clip?.suggestedSubtitleCaption}"</p>
                        <button
                          type="button" onClick={() => copyToClipboard(clip?.suggestedSubtitleCaption || "", index)}
                          className="absolute top-2 right-2 opacity-0 group-hover/caption:opacity-100 text-zinc-500 hover:text-white transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button" onClick={() => copyToClipboard(clip?.suggestedSubtitleCaption || "", index)}
                          className="py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[11px] font-medium rounded-md transition-all text-zinc-300 text-center"
                        >
                          {copiedIndex === index ? "Copied! ✓" : "Copy Caption"}
                        </button>
                        <a
                          href={videoUrls[index] || "#"} download={`ClipForge-${index + 1}.mp4`}
                          onClick={(e) => { if(!videoUrls[index]) e.preventDefault(); }}
                          className={`py-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 text-center ${
                            videoUrls[index] ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" : "bg-zinc-900 text-zinc-600 cursor-not-allowed pointer-events-none"
                          }`}
                        >
                          Download Clip
                        </a>
                      </div>
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