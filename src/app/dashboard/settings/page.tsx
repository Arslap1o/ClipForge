"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const savedKey = localStorage.getItem("clipforge_gemini_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");

    setTimeout(() => {
      localStorage.setItem("clipforge_gemini_key", apiKey.trim());
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-zinc-300">Settings</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Configuration
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your local environments and processing service credentials.
          </p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-6 backdrop-blur-md shadow-2xl">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="api-key" className="block text-sm font-medium text-zinc-300">
                Gemini API Key
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showKey ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your key is stored securely inside your local browser context. It is never transmitted or saved to an external database.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Back to Dashboard
              </Link>
              <button
                type="submit"
                disabled={status === "saving"}
                className="px-6 py-2 bg-white text-zinc-950 font-medium text-sm rounded-md hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center gap-2 shadow-lg"
              >
                {status === "saving" && (
                  <svg className="animate-spin h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {status === "idle" && "Save Configuration"}
                {status === "saving" && "Saving..."}
                {status === "saved" && "Saved Successfully ✓"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}