import { describe, expect, it } from "vitest";
import { mapAssemblyAiToSegments, type AssemblyAiTranscript } from "@/lib/transcription/assemblyai";

function baseTranscript(overrides: Partial<AssemblyAiTranscript>): AssemblyAiTranscript {
  return {
    id: "t1",
    status: "completed",
    text: null,
    utterances: null,
    words: null,
    audio_duration: null,
    ...overrides,
  };
}

describe("mapAssemblyAiToSegments", () => {
  it("prefers utterances and converts ms to seconds", () => {
    const transcript = baseTranscript({
      utterances: [
        { text: "Hello there", start: 0, end: 2500, speaker: "A" },
        { text: "Hi, welcome", start: 2600, end: 5000, speaker: "B" },
      ],
    });
    const segments = mapAssemblyAiToSegments(transcript);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ index: 0, startSeconds: 0, endSeconds: 2.5, text: "发言人 A：Hello there" });
    expect(segments[1]).toMatchObject({ index: 1, startSeconds: 2.6, endSeconds: 5 });
  });

  it("omits the speaker prefix when speaker is null", () => {
    const transcript = baseTranscript({
      utterances: [{ text: "No diarization here", start: 0, end: 1000, speaker: null }],
    });
    const segments = mapAssemblyAiToSegments(transcript);
    expect(segments[0].text).toBe("No diarization here");
  });

  it("falls back to bucketing words into ~15s windows when there are no utterances", () => {
    const transcript = baseTranscript({
      words: [
        { text: "one", start: 0, end: 400 },
        { text: "two", start: 500, end: 900 },
        { text: "three", start: 16_000, end: 16_400 }, // > 15s after bucket start -> new bucket
      ],
    });
    const segments = mapAssemblyAiToSegments(transcript);
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe("one two");
    expect(segments[1].text).toBe("three");
    expect(segments[1].startSeconds).toBe(16);
  });

  it("falls back to a single full-text segment when there are no utterances or words", () => {
    const transcript = baseTranscript({ text: "Just the full text.", audio_duration: 42 });
    const segments = mapAssemblyAiToSegments(transcript);
    expect(segments).toEqual([{ index: 0, startSeconds: 0, endSeconds: 42, text: "Just the full text." }]);
  });

  it("returns an empty array when there is nothing to work with", () => {
    const transcript = baseTranscript({});
    expect(mapAssemblyAiToSegments(transcript)).toEqual([]);
  });
});
