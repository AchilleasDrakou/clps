import { ElevenLabsClient } from "elevenlabs";
import fs from "fs/promises";
import path from "path";
import { DemoBeat, NarrationResult, NarrationSegment } from "./types";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

async function narrateBeat(
  beat: DemoBeat,
  outputDir: string,
  voiceId: string
): Promise<NarrationSegment | null> {
  if (!beat.narrationText?.trim()) return null;

  const segmentPath = path.join(outputDir, `narration-${beat.id}.mp3`);

  const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text: beat.narrationText,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
  });

  const audioChunks: Buffer[] = [];
  let wordTimestamps: { word: string; startMs: number; endMs: number }[] = [];

  if (response && typeof response === "object") {
    const resp = response as any;
    if (resp.audio_base64) {
      audioChunks.push(Buffer.from(resp.audio_base64, "base64"));
    }
    if (resp.alignment) {
      const chars = resp.alignment.characters ?? [];
      const starts = resp.alignment.character_start_times_seconds ?? [];
      const ends = resp.alignment.character_end_times_seconds ?? [];

      let currentWord = "";
      let wordStart = 0;
      let wordEnd = 0;

      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === " " || i === chars.length - 1) {
          if (i === chars.length - 1 && chars[i] !== " ") {
            currentWord += chars[i];
            wordEnd = (ends[i] ?? 0) * 1000;
          }
          if (currentWord.trim()) {
            wordTimestamps.push({ word: currentWord.trim(), startMs: wordStart, endMs: wordEnd });
          }
          currentWord = "";
          wordStart = (starts[i + 1] ?? 0) * 1000;
        } else {
          if (currentWord === "") wordStart = (starts[i] ?? 0) * 1000;
          currentWord += chars[i];
          wordEnd = (ends[i] ?? 0) * 1000;
        }
      }
    }
  }

  if (audioChunks.length > 0) {
    await fs.writeFile(segmentPath, Buffer.concat(audioChunks));
  }

  const lastWord = wordTimestamps[wordTimestamps.length - 1];
  return {
    beatId: beat.id,
    audioPath: segmentPath,
    durationMs: lastWord ? lastWord.endMs : 2000,
    wordTimestamps,
  };
}

export async function narrateBeats(
  beats: DemoBeat[],
  outputDir: string,
  voiceId = DEFAULT_VOICE_ID
): Promise<NarrationResult> {
  // Generate all beats in parallel (up to 5 concurrent)
  const CONCURRENCY = 5;
  const beatsWithText = beats.filter((b) => b.narrationText?.trim());
  const segments: NarrationSegment[] = [];

  for (let i = 0; i < beatsWithText.length; i += CONCURRENCY) {
    const batch = beatsWithText.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((beat) => narrateBeat(beat, outputDir, voiceId).catch(() => null))
    );
    for (const r of results) {
      if (r) segments.push(r);
    }
  }

  // Sort segments back to beat order
  const beatOrder = new Map(beats.map((b, i) => [b.id, i]));
  segments.sort((a, b) => (beatOrder.get(a.beatId) ?? 0) - (beatOrder.get(b.beatId) ?? 0));

  // Concat via FFmpeg
  const finalAudioPath = path.join(outputDir, "narration.mp3");
  if (segments.length > 0) {
    const listPath = path.join(outputDir, "narration-list.txt");
    await fs.writeFile(
      listPath,
      segments.map((s) => `file '${path.basename(s.audioPath)}'`).join("\n")
    );
    const { execSync } = await import("child_process");
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${finalAudioPath}"`, {
      cwd: outputDir,
      stdio: "pipe",
    });
  }

  return {
    audioPath: finalAudioPath,
    segments,
    totalDurationMs: segments.reduce((sum, s) => sum + s.durationMs, 0),
  };
}
