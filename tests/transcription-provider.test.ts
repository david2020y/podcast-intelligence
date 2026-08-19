import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveTranscriptionProvider, getTranscriptionModel, getTranscriptionClientConfig, getAppBaseUrl } from "@/lib/config";

const ENV_KEYS = [
  "ASSEMBLYAI_API_KEY",
  "GROQ_API_KEY",
  "OPENAI_API_KEY",
  "TRANSCRIPTION_PROVIDER",
  "TRANSCRIPTION_MODEL",
  "APP_BASE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
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

describe("resolveTranscriptionProvider", () => {
  it("returns null when neither key is set", () => {
    setEnv({});
    expect(resolveTranscriptionProvider()).toBeNull();
  });

  it("prefers assemblyai when all three keys are present", () => {
    setEnv({ ASSEMBLYAI_API_KEY: "aai_x", GROQ_API_KEY: "gsk_x", OPENAI_API_KEY: "sk_x" });
    expect(resolveTranscriptionProvider()).toBe("assemblyai");
  });

  it("prefers groq over openai when assemblyai isn't configured", () => {
    setEnv({ GROQ_API_KEY: "gsk_x", OPENAI_API_KEY: "sk_x" });
    expect(resolveTranscriptionProvider()).toBe("groq");
  });

  it("falls back to openai when only the openai key is set", () => {
    setEnv({ OPENAI_API_KEY: "sk_x" });
    expect(resolveTranscriptionProvider()).toBe("openai");
  });

  it("uses groq alone when only the groq key is set", () => {
    setEnv({ GROQ_API_KEY: "gsk_x" });
    expect(resolveTranscriptionProvider()).toBe("groq");
  });

  it("uses assemblyai alone when only the assemblyai key is set", () => {
    setEnv({ ASSEMBLYAI_API_KEY: "aai_x" });
    expect(resolveTranscriptionProvider()).toBe("assemblyai");
  });

  it("honors an explicit TRANSCRIPTION_PROVIDER override", () => {
    setEnv({ ASSEMBLYAI_API_KEY: "aai_x", GROQ_API_KEY: "gsk_x", OPENAI_API_KEY: "sk_x", TRANSCRIPTION_PROVIDER: "openai" });
    expect(resolveTranscriptionProvider()).toBe("openai");
  });

  it("ignores an explicit override naming a provider whose key is missing", () => {
    setEnv({ OPENAI_API_KEY: "sk_x", TRANSCRIPTION_PROVIDER: "groq" });
    expect(resolveTranscriptionProvider()).toBe("openai");
  });
});

describe("getAppBaseUrl", () => {
  it("returns null when nothing is configured", () => {
    setEnv({});
    expect(getAppBaseUrl()).toBeNull();
  });

  it("prefers an explicit APP_BASE_URL and strips a trailing slash", () => {
    setEnv({ APP_BASE_URL: "https://example.com/", VERCEL_PROJECT_PRODUCTION_URL: "other.vercel.app" });
    expect(getAppBaseUrl()).toBe("https://example.com");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL", () => {
    setEnv({ VERCEL_PROJECT_PRODUCTION_URL: "myapp.vercel.app", VERCEL_URL: "myapp-git-branch.vercel.app" });
    expect(getAppBaseUrl()).toBe("https://myapp.vercel.app");
  });

  it("falls back to VERCEL_URL as a last resort", () => {
    setEnv({ VERCEL_URL: "myapp-git-branch.vercel.app" });
    expect(getAppBaseUrl()).toBe("https://myapp-git-branch.vercel.app");
  });
});

describe("getTranscriptionModel", () => {
  it("defaults to whisper-large-v3 for groq", () => {
    setEnv({});
    expect(getTranscriptionModel("groq")).toBe("whisper-large-v3");
  });

  it("defaults to whisper-1 for openai", () => {
    setEnv({});
    expect(getTranscriptionModel("openai")).toBe("whisper-1");
  });

  it("respects an explicit TRANSCRIPTION_MODEL override for either provider", () => {
    setEnv({ TRANSCRIPTION_MODEL: "whisper-large-v3-turbo" });
    expect(getTranscriptionModel("groq")).toBe("whisper-large-v3-turbo");
    expect(getTranscriptionModel("openai")).toBe("whisper-large-v3-turbo");
  });
});

describe("getTranscriptionClientConfig", () => {
  it("points groq at the Groq OpenAI-compatible base URL", () => {
    setEnv({ GROQ_API_KEY: "gsk_x" });
    const config = getTranscriptionClientConfig("groq");
    expect(config.apiKey).toBe("gsk_x");
    expect(config.baseURL).toBe("https://api.groq.com/openai/v1");
  });

  it("uses no custom baseURL for openai (default SDK endpoint)", () => {
    setEnv({ OPENAI_API_KEY: "sk_x" });
    const config = getTranscriptionClientConfig("openai");
    expect(config.apiKey).toBe("sk_x");
    expect(config.baseURL).toBeUndefined();
  });
});
