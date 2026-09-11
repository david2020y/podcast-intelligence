import type { AppMode } from "@/lib/types";

function isSet(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export type TranscriptionProvider = "local-whisper" | "assemblyai" | "groq" | "openai";
export type SyncTranscriptionProvider = "groq" | "openai";
export type CloudTranscriptionProvider = Exclude<TranscriptionProvider, "local-whisper">;

/**
 * Local inference (LM Studio / whisper.cpp) is opt-in via an explicit env var rather than
 * auto-detected, because the only place it can possibly work is a machine that runs the models
 * itself. A cloud deployment (Vercel) can never reach the operator's localhost, so probing for
 * it there would just burn a connection timeout on every job before falling back. Setting the
 * var is what declares "this process runs next to the models" — the local worker sets it, the
 * Vercel deployment doesn't, and each picks the right provider with no probing at all.
 */
export interface LmStudioConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export function getLmStudioConfig(): LmStudioConfig | null {
  const baseURL = process.env.LMSTUDIO_BASE_URL;
  if (!isSet(baseURL)) return null;
  return {
    // LM Studio ignores the key entirely, but the OpenAI SDK refuses to construct without one.
    apiKey: process.env.LMSTUDIO_API_KEY || "lm-studio",
    baseURL: baseURL!.trim().replace(/\/$/, ""),
    model: process.env.LMSTUDIO_MODEL || "deepseek/deepseek-v4-flash",
  };
}

export interface LocalWhisperConfig {
  cliPath: string;
  modelPath: string;
  threads: number;
  language: string;
}

export function getLocalWhisperConfig(): LocalWhisperConfig | null {
  const modelPath = process.env.WHISPER_MODEL_PATH;
  if (!isSet(modelPath)) return null;
  return {
    cliPath: process.env.WHISPER_CLI_PATH || "whisper-cli",
    modelPath: modelPath!.trim(),
    // whisper.cpp does the heavy lifting on the GPU via Metal; the thread count only affects
    // the CPU-side pre/post-processing, so a modest default is fine.
    threads: Number(process.env.WHISPER_THREADS) || 8,
    // "auto" lets whisper detect per-episode, which matters for a mixed 中文/English library.
    language: process.env.WHISPER_LANGUAGE || "auto",
  };
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL_BY_SYNC_PROVIDER: Record<SyncTranscriptionProvider, string> = {
  // whisper-large-v3 (not the cheaper -turbo variant) to keep accuracy close to OpenAI's
  // whisper-1 by default, since podcast transcripts lean on proper nouns (names, tickers).
  groq: "whisper-large-v3",
  openai: "whisper-1",
};

/**
 * Resolves which transcription backend to use. AssemblyAI is preferred when configured: it
 * accepts a plain audio URL (no download/upload needed) and handles multi-hour files, which
 * Groq/OpenAI's whisper endpoints cannot (both cap at 25MB). Groq/OpenAI remain as a cheaper
 * synchronous fallback for shorter episodes when AssemblyAI isn't configured. Explicit
 * TRANSCRIPTION_PROVIDER wins over this default ordering.
 */
export function resolveTranscriptionProvider(): TranscriptionProvider | null {
  const explicit = process.env.TRANSCRIPTION_PROVIDER?.trim().toLowerCase();
  if (explicit === "local-whisper" && getLocalWhisperConfig()) return "local-whisper";
  // Local first: it's free, unmetered, has no 25MB/duration ceiling, and on Apple Silicon runs
  // well above realtime — so when this process has the models, nothing cloud-side beats it.
  if (!explicit && getLocalWhisperConfig()) return "local-whisper";
  return resolveCloudTranscriptionProvider();
}

/** Cloud-only resolution — also the fallback path when local whisper fails mid-job. */
export function resolveCloudTranscriptionProvider(): CloudTranscriptionProvider | null {
  const hasAssemblyAiKey = isSet(process.env.ASSEMBLYAI_API_KEY);
  const hasGroqKey = isSet(process.env.GROQ_API_KEY);
  const hasOpenAiKey = isSet(process.env.OPENAI_API_KEY);
  const explicit = process.env.TRANSCRIPTION_PROVIDER?.trim().toLowerCase();

  if (explicit === "assemblyai" && hasAssemblyAiKey) return "assemblyai";
  if (explicit === "groq" && hasGroqKey) return "groq";
  if (explicit === "openai" && hasOpenAiKey) return "openai";
  if (hasAssemblyAiKey) return "assemblyai";
  if (hasGroqKey) return "groq";
  if (hasOpenAiKey) return "openai";
  return null;
}

export type AiProvider = "lmstudio" | "anthropic" | "deepseek";
export type CloudAiProvider = Exclude<AiProvider, "lmstudio">;

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/**
 * Resolves which LLM to use for episode analysis. Anthropic is preferred by default when both
 * are configured — it's the provider we've validated most for this task's strict "never
 * fabricate a quote or timestamp" requirement. DeepSeek is OpenAI-tool-call compatible and
 * roughly 20-50x cheaper per token; set AI_PROVIDER=deepseek to prefer it once you've compared
 * output quality on a few episodes.
 */
export function resolveAiProvider(): AiProvider | null {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "lmstudio" && getLmStudioConfig()) return "lmstudio";
  if (!explicit && getLmStudioConfig()) return "lmstudio";
  return resolveCloudAiProvider();
}

/** Cloud-only resolution — also the fallback path when the local model fails mid-job. */
export function resolveCloudAiProvider(): CloudAiProvider | null {
  const hasAnthropicKey = isSet(process.env.ANTHROPIC_API_KEY);
  const hasDeepSeekKey = isSet(process.env.DEEPSEEK_API_KEY);
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (explicit === "deepseek" && hasDeepSeekKey) return "deepseek";
  if (explicit === "anthropic" && hasAnthropicKey) return "anthropic";
  if (hasAnthropicKey) return "anthropic";
  if (hasDeepSeekKey) return "deepseek";
  return null;
}

export function getAiModel(provider: AiProvider): string {
  if (provider === "lmstudio") return getLmStudioConfig()?.model ?? "lmstudio";
  // "deepseek-chat" was the old alias, retired 2026-07-24 — deepseek-v4-pro is the current
  // GA model ID. Pro (not the cheaper Flash) by default: this task's payoff is accuracy on a
  // strict "never fabricate a quote or timestamp" extraction, not raw throughput.
  if (provider === "deepseek") return process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";
  return process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
}

export function getDeepSeekClientConfig(): { apiKey: string; baseURL: string } {
  return { apiKey: process.env.DEEPSEEK_API_KEY!, baseURL: DEEPSEEK_BASE_URL };
}

export function getAppMode(): AppMode {
  const hasSupabase =
    isSet(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    isSet(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const aiProvider = resolveAiProvider();
  const transcriptionProvider = resolveTranscriptionProvider();

  return {
    mockMode: !hasSupabase,
    hasSupabase,
    hasAnthropicKey: isSet(process.env.ANTHROPIC_API_KEY),
    aiProvider,
    // Named "hasTranscriptionKey" from when every backend was an API key; local whisper needs
    // no key, so this now means "some transcription backend is available".
    hasTranscriptionKey: transcriptionProvider !== null,
    transcriptionProvider,
    localAi: getLmStudioConfig() !== null,
    localWhisper: getLocalWhisperConfig() !== null,
  };
}

export function getTranscriptionModel(provider: SyncTranscriptionProvider): string {
  return process.env.TRANSCRIPTION_MODEL || DEFAULT_MODEL_BY_SYNC_PROVIDER[provider];
}

export function getTranscriptionClientConfig(provider: SyncTranscriptionProvider): { apiKey: string; baseURL?: string } {
  if (provider === "groq") {
    return { apiKey: process.env.GROQ_API_KEY!, baseURL: GROQ_BASE_URL };
  }
  return { apiKey: process.env.OPENAI_API_KEY! };
}

/**
 * Public base URL this app is reachable at, needed so AssemblyAI knows where to POST its
 * completion webhook. Prefers an explicit override, then Vercel's auto-injected production
 * domain (stable across deployments), then the current deployment's own URL.
 */
export function getAppBaseUrl(): string | null {
  if (isSet(process.env.APP_BASE_URL)) return process.env.APP_BASE_URL!.replace(/\/$/, "");
  if (isSet(process.env.VERCEL_PROJECT_PRODUCTION_URL)) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (isSet(process.env.VERCEL_URL)) return `https://${process.env.VERCEL_URL}`;
  return null;
}

export const ASSEMBLYAI_WEBHOOK_HEADER_NAME = "x-podcast-intel-webhook-secret";
export const ASSEMBLYAI_WEBHOOK_SECRET = process.env.ASSEMBLYAI_WEBHOOK_SECRET;

export const CRON_SECRET = process.env.CRON_SECRET;
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// Optional gate on /api/auth/signup for small-scale invite-only testing. Unset = open signup.
export const SIGNUP_INVITE_CODE = process.env.SIGNUP_INVITE_CODE;

// Comma-separated allowlist of admin phone numbers, e.g. "13800001111,13900002222". Kept as an
// env var rather than a profiles.is_admin column: this app has a single operator, so there's no
// need for a role to manage in the database — redeploying with a new env var is simpler and
// harder to misconfigure than remembering to flip a DB flag for every new admin account.
export function isAdminPhone(phone: string | null): boolean {
  if (!phone) return false;
  const admins = (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return admins.includes(phone);
}
