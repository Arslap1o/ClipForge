import { GoogleGenAI } from "@google/genai";

// Active Gemini processing models for 2026 systems
export type SupportedGeminiModel = 
  | "gemini-3.5-flash" 
  | "gemini-3.1-pro-preview" 
  | "gemini-3.1-flash-lite" 
  | "gemini-2.5-pro" 
  | "gemini-2.5-flash";

export interface ViralClipResponse {
  clips: Array<{
    title: string;
    hookDescription: string;
    startTime: string;
    endTime: string;
    viralityScore: number;
    // Fixes the TS2339 property error in your route pipeline execution
    cropCoordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    suggestedSubtitleCaption: string;
  }>;
}

export async function analyzeVideoForClips(
  apiKey: string, 
  filePath: string,
  modelName: SupportedGeminiModel = "gemini-3.5-flash"
): Promise<ViralClipResponse> {
  const ai = new GoogleGenAI({ apiKey });

  let videoFile = await ai.files.upload({
    file: filePath,
    config: { mimeType: "video/mp4" },
  });

  while (videoFile.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    videoFile = await ai.files.get({ name: videoFile.name });
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      { fileData: { fileUri: videoFile.uri, mimeType: videoFile.mimeType } },
      { text: "Analyze this video for viral moments. Return JSON conforming to response schema." }
    ],
    config: { responseMimeType: "application/json" }
  });

  await ai.files.delete({ name: videoFile.name });
  return JSON.parse(response.text!) as ViralClipResponse;
}