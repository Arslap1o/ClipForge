import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 300;

const localBinDir = path.join(process.cwd(), "bin");
const localFFmpegPath = path.join(localBinDir, "ffmpeg.exe");
const localYtdlpPath = path.join(localBinDir, "yt-dlp.exe");

function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(new Error(`Process Failed: ${error.message}. Stderr: ${stderr}`));
      else resolve();
    });
  });
}

function cleanTimestamp(ts: string): string {
  return ts.replace(/[^0-9:]/g, "").trim();
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a stream response wrapper to push real-time data logs down to client
  const stream = new ReadableStream({
    async start(controller) {
      let tempFilePath = "";
      let requestedModel = "gemini-3.5-flash";

      // Helper function to send streamlined JSON feedback blocks instantly
      const sendStatusUpdate = (status: string, stage: string, detail: any = {}) => {
        const payload = JSON.stringify({ status, stage, timestamp: new Date().toISOString(), ...detail });
        controller.enqueue(encoder.encode(payload + "\n"));
      };

      try {
        let ffmpegBinary = "ffmpeg";
        try {
          await fs.access(localFFmpegPath);
          ffmpegBinary = `"${localFFmpegPath}"`;
        } catch {
          console.warn("Local project ffmpeg.exe not found in /bin.");
        }

        let ytdlpBinary = "yt-dlp";
        try {
          await fs.access(localYtdlpPath);
          ytdlpBinary = `"${localYtdlpPath}"`;
        } catch {
          console.warn("Local project yt-dlp.exe not found in /bin.");
        }

        const geminiKey = request.headers.get("x-gemini-key");
        requestedModel = request.headers.get("x-gemini-model") || "gemini-3.5-flash";
        const targetRatio = request.headers.get("x-video-ratio") || "9:16";
        const targetQuality = request.headers.get("x-video-quality") || "1080";

        if (!geminiKey) {
          sendStatusUpdate("error", "authentication", { message: "Missing Gemini API token." });
          controller.close();
          return;
        }

        const formData = await request.formData();
        const videoFile = formData.get("video") as File | null;
        const youtubeUrl = formData.get("youtubeUrl") as string | null;

        if (!videoFile && !youtubeUrl) {
          sendStatusUpdate("error", "validation", { message: "Provide either a local file or YouTube link." });
          controller.close();
          return;
        }

        const tempDir = os.tmpdir();

        // 1. ASSET EXTRACTION LOGS
        if (youtubeUrl) {
          sendStatusUpdate("processing", "yt-dlp download initiated", { url: youtubeUrl, maxResolution: `${targetQuality}p` });
          const cleanUrl = youtubeUrl.trim();
          tempFilePath = path.join(tempDir, `yt-${Date.now()}.mp4`);
          
          const formatString = `bv*[ext=mp4][height<=${targetQuality}]+ba[ext=m4a]/b[ext=mp4][height<=${targetQuality}]`;
          const downloadCommand = `${ytdlpBinary} --ffmpeg-location ${ffmpegBinary} -f "${formatString}" --merge-output-format mp4 "${cleanUrl}" -o "${tempFilePath}"`;
          
          await runCommand(downloadCommand);
          sendStatusUpdate("processing", "yt-dlp download completed", { savedTo: "local_temp_disk" });
        } else if (videoFile) {
          sendStatusUpdate("processing", "file ingestion initiated", { fileName: videoFile.name, sizeBytes: videoFile.size });
          const bytes = await videoFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          tempFilePath = path.join(tempDir, `${Date.now()}-${videoFile.name}`);
          await fs.writeFile(tempFilePath, buffer);
          sendStatusUpdate("processing", "file ingestion completed", {});
        }

        // 2. GEMINI INFERENCE LOGS
        sendStatusUpdate("processing", "gemini cloud upload initiated", { targetModel: requestedModel });
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        let uploadedFile = await ai.files.upload({
          file: tempFilePath,
          config: { mimeType: "video/mp4" },
        });

        while (uploadedFile.state === "PROCESSING") {
          sendStatusUpdate("processing", "gemini analyzing frames", { state: "CLOUD_PROCESSING" });
          await new Promise((resolve) => setTimeout(resolve, 4000));
          uploadedFile = await ai.files.get({ name: uploadedFile.name });
        }

        if (uploadedFile.state === "FAILED") {
          throw new Error("Gemini File API rejected processing operations.");
        }

        sendStatusUpdate("processing", "gemini parsing viral structures", { state: "GENERATING_SCHEMAS" });
        const promptText = "Analyze this video file. Find 1 to 3 interesting highlight clips. Return start and end times matching absolute length formats.";

        const aiResponse = await ai.models.generateContent({
          model: requestedModel,
          contents: [
            { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
            { text: promptText }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                clips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      hookDescription: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      endTime: { type: Type.STRING },
                      suggestedSubtitleCaption: { type: Type.STRING },
                      viralityScore: { type: Type.INTEGER }
                    },
                    required: ["title", "hookDescription", "startTime", "endTime", "suggestedSubtitleCaption", "viralityScore"]
                  }
                }
              },
              required: ["clips"]
            }
          }
        });

        await ai.files.delete({ name: uploadedFile.name });
        const parsedData = JSON.parse(aiResponse.text || "{}");

        if (!parsedData.clips || !Array.isArray(parsedData.clips)) {
          throw new Error("No structured clips returned by the AI structural model.");
        }

        sendStatusUpdate("processing", "gemini metadata generated successfully", { totalClipsFound: parsedData.clips.length });

        // 3. FFMPEG RENDERING LOGS
        const outputDir = path.join(process.cwd(), "public", "clips");
        await fs.mkdir(outputDir, { recursive: true });
        const generatedUrls: string[] = [];

        let videoFilterString = "";
        if (targetRatio === "9:16") videoFilterString = `-vf "crop=ih*(9/16):ih"`;
        else if (targetRatio === "1:1") videoFilterString = `-vf "crop=ih:ih"`;

        for (let i = 0; i < parsedData.clips.length; i++) {
          const clip = parsedData.clips[i];
          const start = cleanTimestamp(clip.startTime);
          const end = cleanTimestamp(clip.endTime);
          
          sendStatusUpdate("processing", `ffmpeg transcoding clip #${i + 1}`, { clipTitle: clip.title, timestamps: `${start} - ${end}` });

          const clipFileName = `clip-${Date.now()}-${i}.mp4`;
          const absoluteOutputPath = path.join(outputDir, clipFileName);
          const ffmpegCommand = `${ffmpegBinary} -y -i "${tempFilePath}" -ss ${start} -to ${end} ${videoFilterString} -c:v libx264 -preset veryfast -profile:v main -level:v 3.1 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags faststart "${absoluteOutputPath}"`;

          try {
            await runCommand(ffmpegCommand);
            generatedUrls.push(`/clips/${clipFileName}?t=${Date.now()}`);
          } catch (err: any) {
            throw new Error(`FFmpeg Slicing Error on Clip #${i+1}: ${err.message}`);
          }
        }

        // 4. PIPELINE COMPLETION SCRIPT SUCCESS
        const finalPayload = JSON.stringify({ status: "success", stage: "complete", meta: parsedData.clips, urls: generatedUrls });
        controller.enqueue(encoder.encode(finalPayload + "\n"));
        controller.close();

      } catch (error: any) {
        const errorMessage = error?.message || "";
        let cleanMsg = errorMessage;
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("exhausted")) {
          cleanMsg = `Your usage limit for ${requestedModel} has been exceeded. Please switch to another model or try again later.`;
        }
        const errPayload = JSON.stringify({ status: "failed", stage: "error", error: cleanMsg });
        controller.enqueue(encoder.encode(errPayload + "\n"));
        controller.close();
      } finally {
        if (tempFilePath) {
          try { await fs.unlink(tempFilePath); } catch (e) {}
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}