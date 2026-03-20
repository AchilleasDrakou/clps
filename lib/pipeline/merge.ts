import { execSync } from "child_process";
import path from "path";

function checkFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
  } catch {
    throw new Error("ffmpeg not found. Install it: brew install ffmpeg");
  }
}

export async function mergeVideoAudio(
  videoPath: string,
  audioPath: string,
  outputDir: string
): Promise<string> {
  checkFfmpeg();
  const finalPath = path.join(outputDir, "final.mp4");

  try {
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalPath}"`,
      { timeout: 120000, stdio: "pipe" }
    );
  } catch (err: any) {
    throw new Error(`FFmpeg merge failed: ${err.stderr?.toString().slice(-200) ?? err.message}`);
  }

  return finalPath;
}
