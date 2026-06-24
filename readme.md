# ClipForge 🎬

ClipForge is an advanced, production-ready full-stack AI media processing workspace engineered using Next.js (App Router), TypeScript, and Tailwind CSS. The workspace programmatically coordinates asynchronous video downsampling, structured multimodal AI behavioral analysis via the Gemini API, and automated local multi-format canvas transformations. 

By employing local binary wrappers for video decoding and streaming performance telemetry via Server-Sent Events (SSE), ClipForge minimizes server-side overhead and provides an instantaneous, transparent desktop-grade editing interface in the browser.

---

## 🛠️ Tech Stack & Key Tooling

* **Frontend Architecture:** Next.js 15 (App Router), React, TypeScript
* **Styling & Theme Framework:** Tailwind CSS (Minimalist, dark-mode workspace design language)
* **Localized Processing Cores:** Native C++ binaries managed through runtime child processes:
  * `FFmpeg` (Spatial aspect ratio re-encoding, timeline slicing, canvas mapping)
  * `yt-dlp` (Stream-level video scraping and payload filtration)
* **Intelligence Layer:** Google Gen AI SDK (Multimodal structured timeline extraction)
* **Binary Distribution:** Git LFS (Large File Storage) for instant developer synchronization

---

## 🚀 Key Architectural Breakthroughs

### 1. Live Telemetry Streaming (NDJSON & SSE)
Instead of waiting on monolithic, blocking HTTP requests that create user feedback dead-zones during long video extraction pipelines, ClipForge uses **Server-Sent Events (SSE)**. The backend pushes live, fine-grained process markers as an `application/x-ndjson` stream directly into a responsive custom telemetry card component, displaying real-time pipeline milestones as they occur.

### 2. Multi-Format Canvas Recalculation Loops
The application spawns localized asynchronous child shell processes running native `FFmpeg` layers to handle structural canvas resizing. Instead of trivial cropping, it maps matrix operations to preserve maximum visual continuity:
* **Vertical Canvas (9:16 Shorts):** `-vf "crop=ih*(9/16):ih"`
* **Square Matrix (1:1 Social Grid):** `-vf "crop=ih:ih"`
Encoded components utilize optimized H.264 profiles (`libx264`) and specific speed presets to accelerate hardware rendering queues locally.

### 3. Native Binary Portability (Git LFS Ecosystem)
To remove the friction of requiring users to hunt down correct system environment path paths or manually extract third-party archives, structural executables (`ffmpeg.exe`, `ffplay.exe`, `ffprobe.exe`) are bundled straight into the source. They are routed via **Git Large File Storage (LFS)** to bypass GitHub's 100MB asset restrictions, instantly provisioning the workspace upon a simple `git clone`.

---

## 📊 Performance Optimization Matrix

*Benchmarks conducted on identical 6-minute target source video assets to evaluate hardware resource minimization metrics:*

| Resolution Target | AI Processing Model | Data Ingestion Profile | Total Pipeline Latency | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1080p** (Full HD) | Gemini 3.5 Flash | Raw Stream Ingest (~365MB) | ~3m 40s | Baseline Pipeline |
| **1080p** (Full HD) | Gemini 3.5 Flash Lite | Model Optimization Layer | ~2m 45s | Structural Optimization |
| **480p** (Standard) | Gemini 3.5 Flash Lite | Full Pipeline Configuration | **2m 10s** | **Fully Optimized** |

---

## 🔧 Prerequisites & Local Deployment

### 1. System Requirements
To spin up the development environment, ensure you have the JavaScript runtime environment provisioned globally on your system:
* **Node.js:** `v18.x` or later (LTS recommended)
* **npm:** Automatically bundled with Node.js

Verify access parameters via your command line:
```bash
node -v
npm -v