import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveAiProvider, getAiModel, getDeepSeekClientConfig } from "@/lib/config";

const ENV_KEYS = ["ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY", "AI_PROVIDER", "CLAUDE_MODEL", "DEEPSEEK_MODEL"] as const;
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

describe("resolveAiProvider", () => {
  it("returns null when neither key is set", () => {
    setEnv({});
    expect(resolveAiProvider()).toBeNull();
  });

  it("prefers anthropic when both keys are present", () => {
    setEnv({ ANTHROPIC_API_KEY: "sk-ant-x", DEEPSEEK_API_KEY: "sk-ds-x" });
    expect(resolveAiProvider()).toBe("anthropic");
  });

  it("falls back to deepseek when only the deepseek key is set", () => {
    setEnv({ DEEPSEEK_API_KEY: "sk-ds-x" });
    expect(resolveAiProvider()).toBe("deepseek");
  });

  it("uses anthropic alone when only the anthropic key is set", () => {
    setEnv({ ANTHROPIC_API_KEY: "sk-ant-x" });
    expect(resolveAiProvider()).toBe("anthropic");
  });

  it("honors an explicit AI_PROVIDER override", () => {
    setEnv({ ANTHROPIC_API_KEY: "sk-ant-x", DEEPSEEK_API_KEY: "sk-ds-x", AI_PROVIDER: "deepseek" });
    expect(resolveAiProvider()).toBe("deepseek");
  });

  it("ignores an explicit override naming a provider whose key is missing", () => {
    setEnv({ ANTHROPIC_API_KEY: "sk-ant-x", AI_PROVIDER: "deepseek" });
    expect(resolveAiProvider()).toBe("anthropic");
  });
});

describe("getAiModel", () => {
  it("defaults to claude-sonnet-4-5 for anthropic", () => {
    setEnv({});
    expect(getAiModel("anthropic")).toBe("claude-sonnet-4-5");
  });

  it("defaults to deepseek-v4-pro for deepseek", () => {
    setEnv({});
    expect(getAiModel("deepseek")).toBe("deepseek-v4-pro");
  });

  it("respects CLAUDE_MODEL and DEEPSEEK_MODEL overrides independently", () => {
    setEnv({ CLAUDE_MODEL: "claude-opus-5", DEEPSEEK_MODEL: "deepseek-reasoner" });
    expect(getAiModel("anthropic")).toBe("claude-opus-5");
    expect(getAiModel("deepseek")).toBe("deepseek-reasoner");
  });
});

describe("getDeepSeekClientConfig", () => {
  it("points at the DeepSeek OpenAI-compatible base URL with the configured key", () => {
    setEnv({ DEEPSEEK_API_KEY: "sk-ds-x" });
    const config = getDeepSeekClientConfig();
    expect(config.apiKey).toBe("sk-ds-x");
    expect(config.baseURL).toBe("https://api.deepseek.com");
  });
});
