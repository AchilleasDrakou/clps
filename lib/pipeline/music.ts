import { ElevenLabsClient } from "elevenlabs";
import fs from "fs/promises";
import path from "path";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

export async function generateMusicBed(
  durationSec: number,
  outputDir: string,
  prompt?: string
): Promise<string> {
  const audioPath = path.join(outputDir, "music.mp3");

  const description = prompt ??
    `Upbeat, modern, cinematic background music for a software product demo. Clean and professional. ${Math.round(durationSec)} seconds.`;

  const response = await client.textToSoundEffects.convert({
    text: description,
    duration_seconds: Math.min(Math.max(durationSec, 0.5), 30), // API limit: 0.5-30s
    prompt_influence: 0.5,
  });

  // Response is an async iterator of audio chunks
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    throw new Error("ElevenLabs Sound Effects returned no audio");
  }

  await fs.writeFile(audioPath, Buffer.concat(chunks));
  return audioPath;
}
