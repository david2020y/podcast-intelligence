import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLmStudioConfig,
  getLocalWhisperConfig,
  resolveAiProvider,
  resolveCloudAiProvider,
  resolveTranscriptionProvider,
  resolveCloudTranscriptionProvider,
  getAiModel,
} from "@/lib/config";
import { normalizeWhisperLanguage } from "@/lib/transcription/local-whisper";
import { mergeSegmentsForPrompt } from "@/lib/ai/prompt";

const ENV_KEYS = [
  "LMSTUDIO_BASE_URL",
  "LMSTUDIO_MODEL",
  "LMSTUDIO_API_KEY",
  "WHISPER_MODEL_PATH",
  "WHISPER_CLI_PATH",
  "WHISPER_THREADS",
  "WHISPER_LANGUAGE",
  "ANTHROPIC_API_KEY",
  "DEEPSEEK_API_KEY",
  "AI_PROVIDER",
  "ASSEMBLYAI_API_KEY",
  "GROQ_API_KEY",
  "OPENAI_API_KEY",
  "TRANSCRIPTION_PROVIDER",
] as const;
type EnvKey = (typeof ENV_KEYS)[number];

const saved: Partial<Record<EnvKey, string | undefined>> = {};

function setEnv(vars: Partial<Record<EnvKey, string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, vars);
}

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getLmStudioConfig", () => {
  it("is disabled unless LMSTUDIO_BASE_URL is explicitly set", () => {
    setEnv({});
    expect(getLmStudioConfig()).toBeNull();
  });

  it("fills in a default model and a placeholder key, and trims the trailing slash", () => {
    setEnv({ LMSTUDIO_BASE_URL: "http://localhost:1234/v1/" });
    const config = getLmStudioConfig();
    expect(config?.baseURL).toBe("http://localhost:1234/v1");
    expect(config?.model).toBe("deepseek/deepseek-v4-flash");
    // LM Studio ignores the key, but the OpenAI SDK refuses to construct without a non-empty one.
    expect(config?.apiKey).toBeTruthy();
  });

  it("honors an explicit model override", () => {
    setEnv({ LMSTUDIO_BASE_URL: "http://localhost:1234/v1", LMSTUDIO_MODEL: "qwen/qwen3.8-27b" });
    expect(getLmStudioConfig()?.model).toBe("qwen/qwen3.8-27b");
    expect(getAiModel("lmstudio")).toBe("qwen/qwen3.8-27b");
  });
});

describe("getLocalWhisperConfig", () => {
  it("is disabled unless WHISPER_MODEL_PATH is set", () => {
    setEnv({});
    expect(getLocalWhisperConfig()).toBeNull();
  });

  it("defaults the binary to whisper-cli on PATH and language to auto-detect", () => {
    setEnv({ WHISPER_MODEL_PATH: "/models/ggml-large-v3-turbo.bin" });
    const config = getLocalWhisperConfig();
    expect(config?.cliPath).toBe("whisper-cli");
    expect(config?.language).toBe("auto");
    expect(config?.threads).toBeGreaterThan(0);
  });
});

describe("normalizeWhisperLanguage", () => {
  it("reduces a feed's BCP-47 tag to whisper's bare ISO code", () => {
    expect(normalizeWhisperLanguage("zh-cn")).toBe("zh");
    expect(normalizeWhisperLanguage("en-US")).toBe("en");
    expect(normalizeWhisperLanguage("ja")).toBe("ja");
  });

  it("returns null for anything unusable, so whisper falls back to auto-detection", () => {
    expect(normalizeWhisperLanguage(null)).toBeNull();
    expect(normalizeWhisperLanguage("")).toBeNull();
    expect(normalizeWhisperLanguage("chinese")).toBeNull();
  });
});

describe("resolveAiProvider — local first, cloud fallback", () => {
  it("prefers the local model over a configured cloud key", () => {
    setEnv({ LMSTUDIO_BASE_URL: "http://localhost:1234/v1", DEEPSEEK_API_KEY: "sk-test" });
    expect(resolveAiProvider()).toBe("lmstudio");
  });

  it("falls back to cloud when local isn't configured", () => {
    setEnv({ DEEPSEEK_API_KEY: "sk-test" });
    expect(resolveAiProvider()).toBe("deepseek");
  });

  it("never returns the local provider from the cloud-fallback resolver", () => {
    setEnv({ LMSTUDIO_BASE_URL: "http://localhost:1234/v1", DEEPSEEK_API_KEY: "sk-test" });
    expect(resolveCloudAiProvider()).toBe("deepseek");
  });

  it("returns null from the fallback resolver when only local is configured", () => {
    setEnv({ LMSTUDIO_BASE_URL: "http://localhost:1234/v1" });
    expect(resolveAiProvider()).toBe("lmstudio");
    expect(resolveCloudAiProvider()).toBeNull();
  });

  it("lets an explicit AI_PROVIDER pin the cloud provider even with local available", () => {
    setEnv({ LMSTUDIO_BASE_URL: "http://localhost:1234/v1", DEEPSEEK_API_KEY: "sk-test", AI_PROVIDER: "deepseek" });
    expect(resolveAiProvider()).toBe("deepseek");
  });

  it("ignores AI_PROVIDER=lmstudio when local isn't actually configured", () => {
    setEnv({ AI_PROVIDER: "lmstudio", DEEPSEEK_API_KEY: "sk-test" });
    expect(resolveAiProvider()).toBe("deepseek");
  });
});

describe("resolveTranscriptionProvider — local first, cloud fallback", () => {
  it("prefers local whisper over AssemblyAI", () => {
    setEnv({ WHISPER_MODEL_PATH: "/models/ggml.bin", ASSEMBLYAI_API_KEY: "key" });
    expect(resolveTranscriptionProvider()).toBe("local-whisper");
  });

  it("falls back to the cloud ordering when local isn't configured", () => {
    setEnv({ ASSEMBLYAI_API_KEY: "key", GROQ_API_KEY: "key" });
    expect(resolveTranscriptionProvider()).toBe("assemblyai");
  });

  it("never returns local from the cloud-fallback resolver", () => {
    setEnv({ WHISPER_MODEL_PATH: "/models/ggml.bin", GROQ_API_KEY: "key" });
    expect(resolveCloudTranscriptionProvider()).toBe("groq");
  });

  it("returns null from the fallback resolver when only local is configured", () => {
    setEnv({ WHISPER_MODEL_PATH: "/models/ggml.bin" });
    expect(resolveTranscriptionProvider()).toBe("local-whisper");
    expect(resolveCloudTranscriptionProvider()).toBeNull();
  });

  it("lets an explicit TRANSCRIPTION_PROVIDER pin a cloud provider even with local available", () => {
    setEnv({ WHISPER_MODEL_PATH: "/models/ggml.bin", GROQ_API_KEY: "key", TRANSCRIPTION_PROVIDER: "groq" });
    expect(resolveTranscriptionProvider()).toBe("groq");
  });

  it("ignores TRANSCRIPTION_PROVIDER=local-whisper when no model path is configured", () => {
    setEnv({ TRANSCRIPTION_PROVIDER: "local-whisper", GROQ_API_KEY: "key" });
    expect(resolveTranscriptionProvider()).toBe("groq");
  });
});

describe("mergeSegmentsForPrompt", () => {
  const seg = (index: number, startSeconds: number, endSeconds: number, text: string) => ({
    id: String(index),
    transcriptId: "t1",
    segmentIndex: index,
    startSeconds,
    endSeconds,
    text,
  });

  it("merges whisper's sub-second fragments up to a coarser span", () => {
    // whisper.cpp emits ~2s fragments; 10 of them should collapse into far fewer prompt lines.
    const segments = Array.from({ length: 10 }, (_, i) => seg(i, i * 2, i * 2 + 2, `片段${i}`));
    const merged = mergeSegmentsForPrompt(segments);
    expect(merged.length).toBeLessThan(segments.length);
    expect(merged[0].startSeconds).toBe(0);
    expect(merged[0].text).toContain("片段0");
  });

  it("keeps the first segment's start time as the merged line's timestamp", () => {
    const merged = mergeSegmentsForPrompt([seg(0, 100, 108, "前半"), seg(1, 108, 120, "后半")]);
    expect(merged[0].startSeconds).toBe(100);
    expect(merged[0].text).toBe("前半 后半");
  });

  it("keeps a trailing partial group rather than dropping it", () => {
    // The tail of an episode rarely lands exactly on the threshold — it must still be emitted.
    const merged = mergeSegmentsForPrompt([seg(0, 0, 20, "够长的一段"), seg(1, 20, 22, "结尾短句")]);
    expect(merged).toHaveLength(2);
    expect(merged[1].text).toBe("结尾短句");
  });

  it("skips blank segments", () => {
    const merged = mergeSegmentsForPrompt([seg(0, 0, 2, "   "), seg(1, 2, 20, "有内容")]);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("有内容");
  });

  it("returns nothing for an empty transcript", () => {
    expect(mergeSegmentsForPrompt([])).toEqual([]);
  });
});
