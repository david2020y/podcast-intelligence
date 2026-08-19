import { describe, expect, it } from "vitest";
import { parseToolArguments, AnalysisError } from "@/lib/ai/analyze";

describe("parseToolArguments", () => {
  it("parses well-formed JSON directly", () => {
    expect(parseToolArguments('{"a": 1, "b": "x"}', "Test")).toEqual({ a: 1, b: "x" });
  });

  it("repairs an unescaped double quote inside a string value", () => {
    // A model copying a quoted phrase from the transcript verbatim without escaping it —
    // the single most common way "almost valid" tool-call JSON breaks in practice.
    const broken = '{"quote": "he said "hello" to everyone"}';
    const result = parseToolArguments(broken, "Test") as { quote: string };
    expect(result.quote).toContain("hello");
  });

  it("repairs a trailing comma", () => {
    const broken = '{"a": 1, "b": 2,}';
    expect(parseToolArguments(broken, "Test")).toEqual({ a: 1, b: 2 });
  });

  it("repairs an unterminated string at the end (simulated truncation)", () => {
    const broken = '{"a": 1, "b": "unterminated';
    const result = parseToolArguments(broken, "Test") as { a: number; b: string };
    expect(result.a).toBe(1);
    expect(result.b).toContain("unterminated");
  });

  it("throws AnalysisError with a bounded snippet when the input is unrecoverable", () => {
    const hopeless = "not json at all {{{{";
    expect(() => parseToolArguments(hopeless, "DeepSeek")).toThrow(AnalysisError);
    try {
      parseToolArguments(hopeless, "DeepSeek");
    } catch (err) {
      expect(err).toBeInstanceOf(AnalysisError);
      expect((err as Error).message).toContain("DeepSeek");
      expect((err as Error).message).toContain("not json at all");
    }
  });
});
