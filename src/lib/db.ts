import fs from "fs/promises";
import path from "path";

const DB_PATH = path.join(process.cwd(), "clipforge_local_db.json");

export interface LocalVideoRecord {
  id: string;
  filename: string;
  uploadDate: string;
  processingStatus: "PENDING" | "TRANSCRIBING" | "DETECTING_CLIPS" | "PROCESSING_VIDEO" | "COMPLETED" | "FAILED";
  transcript?: any;
  clips?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    title: string;
    reason: string;
    confidenceScore: number;
    clipPath: string;
    socialContent: any;
  }>;
}

export async function getDb(): Promise<{ videos: LocalVideoRecord[] }> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    // If database file doesn't exist yet, return empty initialized state
    return { videos: [] };
  }
}

export async function writeDb(data: { videos: LocalVideoRecord[] }) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function updateVideoRecord(id: string, updates: Partial<LocalVideoRecord>) {
  const db = await getDb();
  db.videos = db.videos.map((v) => (v.id === id ? { ...v, ...updates } : v));
  await writeDb(db);
}