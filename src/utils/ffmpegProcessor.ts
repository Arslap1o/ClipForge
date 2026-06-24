import { exec } from "child_process";
import path from "path";
import fs from "fs";

export interface CropSettings {
  startTime: string;       
  endTime: string;         
  x: number;               
  y: number;               
  width: number;           
  height: number;          
}

/**
 * Spawns a localized hardware-accelerated process to slice and reframer raw widescreen footage into 9:16 vertical shorts.
 */
export function processVerticalClip(
  sourceVideoPath: string,
  outputDirectory: string,
  clipName: string,
  config: CropSettings
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const outputPath = path.join(outputDirectory, clipName);

    const cropWidth = config.width > 0 ? config.width : "ih*(9/16)";
    const cropHeight = config.height > 0 ? config.height : "ih";
    const cropX = config.x > 0 ? config.x : `(iw-${cropWidth})/2`;
    const cropY = config.y > 0 ? config.y : 0;

    const command = `ffmpeg -y -ss ${config.startTime} -to ${config.endTime} -i "${sourceVideoPath}" -vf "crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}" -c:v libx264 -preset fast -c:a copy "${outputPath}"`;

    console.log(`Executing sub-process clip compilation layout:\n${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg core compilation context crashed:`, error);
        return reject(error);
      }
      console.log(`Clip compiled successfully: ${clipName}`);
      resolve(outputPath);
    });
  });
}