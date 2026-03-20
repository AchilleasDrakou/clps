import { ElevenLabsClient } from "elevenlabs";
import fs from "fs/promises";
import path from "path";
import { DemoBeat, NarrationResult, NarrationSegment } from "./types";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

// Default voice — can be swapped after auditioning
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

export async function narrateBeats(
  beats: DemoBeat[],
  outputDir: string,
  voiceId = DEFAULT_VOICE_ID
): Promise<NarrationResult> {
  const segments: NarrationSegment[] = [];

  for (const beat of beats) {
    if (!beat.narrationText || beat.narrationText.trim() === "") continue;

    const segmentPath = path.join(outputDir, `narration-${beat.id}.mp3`);

    // Generate TTS with timestamps
    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text: beat.narrationText,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });

    // Collect audio chunks
    const audioChunks: Buffer[] = [];
    let wordTimestamps: { word: string; startMs: number; endMs: number }[] = [];

    if (response && typeof response === "object") {
      // Handle the response based on its structure
      const resp = response as any;

      if (resp.audio_base64) {
        audioChunks.push(Buffer.from(resp.audio_base64, "base64"));
      }

      if (resp.alignment) {
        const chars = resp.alignment.characters ?? [];
        const starts = resp.alignment.character_start_times_seconds ?? [];
        const ends = resp.alignment.character_end_times_seconds ?? [];

        // Group characters into words
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
              wordTimestamps.push({
                word: currentWord.trim(),
                startMs: wordStart,
                endMs: wordEnd,
              });
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
    const durationMs = lastWord ? lastWord.endMs : 2000;

    segments.push({
      beatId: beat.id,
      audioPath: segmentPath,
      durationMs,
      wordTimestamps,
    });
  }

  // Concat all segments via FFmpeg
  const finalAudioPath = path.join(outputDir, "narration.mp3");

  if (segments.length > 0) {
    const listPath = path.join(outputDir, "narration-list.txt");
    const listContent = segments
      .map((s) => `file '${path.basename(s.audioPath)}'`)
      .join("\n");
    await fs.writeFile(listPath, listContent);

    const { execSync } = await import("child_process");
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${finalAudioPath}"`,
      { cwd: outputDir }
    );
  }

  return {
    audioPath: finalAudioPath,
    segments,
    totalDurationMs: segments.reduce((sum, s) => sum + s.durationMs, 0),
  };
}
