import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { jsonrepair } from "jsonrepair";
import { resolveAiProvider, resolveCloudAiProvider, getAiModel, getDeepSeekClientConfig, getLmStudioConfig } from "@/lib/config";
import * as episodesRepo from "@/lib/repo/episodes";
import * as transcriptsRepo from "@/lib/repo/transcripts";
import * as analysesRepo from "@/lib/repo/analyses";
import * as jobsRepo from "@/lib/repo/jobs";
import { EpisodeAnalysisSchema, type EpisodeAnalysis, type TopicMap } from "@/lib/validation/analysis";
import { ANALYSIS_SYSTEM_PROMPT, STRUCTURED_OUTPUT_SYSTEM_PROMPT, buildTranscriptPrompt } from "@/lib/ai/prompt";
import { ANALYSIS_TOOL_NAME, ANALYSIS_TOOL_DESCRIPTION, ANALYSIS_TOOL_INPUT_SCHEMA } from "@/lib/ai/schema";
import type { EpisodeAnalysisRecord, TranscriptSegment } from "@/lib/types";

export class AnalysisError extends Error {}

/**
 * Tool-call JSON from LLMs is occasionally "almost valid" — an unescaped quote or control
 * character inside a long freeform string field is enough to break a strict JSON.parse, even
 * though the content itself is fine. jsonrepair fixes that whole class of issue without us
 * having to guess which exact character tripped it up. If repair also fails, the thrown error
 * includes a bounded snippet of the raw text so a real syntax problem is diagnosable from logs.
 */
export function parseToolArguments(raw: string, providerLabel: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // fall through to repair
  }
  try {
    return JSON.parse(jsonrepair(raw));
  } catch (err) {
    const snippet = raw.length > 500 ? `${raw.slice(0, 500)}…（已截断，完整长度 ${raw.length} 字符）` : raw;
    const detail = err instanceof Error ? err.message : String(err);
    throw new AnalysisError(`${providerLabel} 返回的参数不是合法 JSON，修复也失败了（${detail}）。原始内容片段：${snippet}`);
  }
}

function buildMockTopicMap(episodeTitle: string, segments: TranscriptSegment[] | undefined, sentences: string[]): TopicMap {
  if (segments && segments.length >= 2) {
    const branchCount = Math.min(4, Math.max(2, Math.ceil(segments.length / 3)));
    const chunkSize = Math.ceil(segments.length / branchCount);
    const branches = [];
    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunk = segments.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      branches.push({
        title: `片段 ${branches.length + 1}`,
        summary: chunk[0].text.slice(0, 40),
        points: chunk.map((s) => ({ text: s.text, timestampSeconds: s.startSeconds })),
      });
    }
    return { centralTopic: episodeTitle, branches };
  }

  const half = Math.max(1, Math.ceil(sentences.length / 2));
  const firstHalf = sentences.slice(0, half);
  const secondHalf = sentences.slice(half);
  return {
    centralTopic: episodeTitle,
    branches: [
      { title: "内容概览（上半段）", summary: firstHalf[0] ?? "暂无内容", points: (firstHalf.length > 0 ? firstHalf : ["暂无内容"]).map((text) => ({ text, timestampSeconds: null })) },
      { title: "内容概览（下半段）", summary: secondHalf[0] ?? "暂无内容", points: (secondHalf.length > 0 ? secondHalf : ["暂无内容"]).map((text) => ({ text, timestampSeconds: null })) },
    ],
  };
}

function buildMockAnalysis(episodeTitle: string, fullText: string, segments: TranscriptSegment[] | undefined): EpisodeAnalysis {
  const firstSegment = segments?.[0];
  const sentences = fullText
    .split(/[\n。.]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4)
    .slice(0, 8);

  return {
    oneLiner: `《${episodeTitle}》— Mock Mode 生成的示例分析，未配置 ANTHROPIC_API_KEY 或 DEEPSEEK_API_KEY。`,
    summary:
      sentences.slice(0, 4).join("。") +
      "。（以上为 Mock Mode 演示摘要，配置 AI 分析密钥后重新分析可获得真实的模型生成内容。）",
    topicMap: buildMockTopicMap(episodeTitle, segments, sentences),
    keyPoints: sentences.length > 0 ? sentences : ["转录内容较短，暂无法提炼核心观点（Mock Mode 示例）"],
    keyData: [],
    guestConclusions: [],
    people: [],
    entities: { companies: [], products: [], assets: [] },
    tags: ["Mock Mode", "示例分析"],
    keyQuotes: firstSegment
      ? [{ quote: firstSegment.text, timestampSeconds: firstSegment.startSeconds, speaker: null }]
      : [],
    openQuestions: ["请配置 ANTHROPIC_API_KEY 或 DEEPSEEK_API_KEY 以获得基于真实转录内容的研究问题建议"],
  };
}

async function callClaude(model: string, episodeTitle: string, segments: TranscriptSegment[] | undefined, fullText: string): Promise<EpisodeAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userPrompt = buildTranscriptPrompt(episodeTitle, segments, fullText);

  const message = await client.messages.create({
    model,
    // topicMap can legitimately run long for a thorough breakdown of a multi-hour episode;
    // 4096 was truncating output mid-JSON on longer transcripts.
    max_tokens: 16000,
    system: ANALYSIS_SYSTEM_PROMPT,
    tools: [
      {
        name: ANALYSIS_TOOL_NAME,
        description: ANALYSIS_TOOL_DESCRIPTION,
        input_schema: ANALYSIS_TOOL_INPUT_SCHEMA as unknown as Anthropic.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: ANALYSIS_TOOL_NAME },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new AnalysisError("Claude 未返回结构化分析结果");
  }

  const parsed = EpisodeAnalysisSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new AnalysisError(`Claude 返回结果未通过校验：${parsed.error.message}`);
  }
  return parsed.data;
}

/** DeepSeek's chat/completions API is OpenAI tool-call compatible — same SDK, different base URL. */
async function callDeepSeek(model: string, episodeTitle: string, segments: TranscriptSegment[] | undefined, fullText: string): Promise<EpisodeAnalysis> {
  const client = new OpenAI(getDeepSeekClientConfig());
  const userPrompt = buildTranscriptPrompt(episodeTitle, segments, fullText);

  // DeepSeek's V4 models default to "thinking mode", which their API rejects when combined with
  // a forced tool_choice ("400 Thinking mode does not support this tool_choice") — a known,
  // widely-reported incompatibility, not specific to our schema. Disabling thinking is the
  // documented workaround; it's a DeepSeek-only extra_body field the OpenAI SDK's types don't
  // know about, so it's added via a typed intersection rather than `any`.
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    thinking?: { type: "disabled" };
  } = {
    model,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: ANALYSIS_TOOL_NAME,
          description: ANALYSIS_TOOL_DESCRIPTION,
          parameters: ANALYSIS_TOOL_INPUT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: ANALYSIS_TOOL_NAME } },
    thinking: { type: "disabled" },
    // Same rationale as Claude's max_tokens above: without an explicit value the API/SDK default
    // was truncating the (now much larger, topicMap-inclusive) tool-call JSON mid-object.
    max_tokens: 16000,
  };

  const completion = await client.chat.completions.create(params);

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new AnalysisError("DeepSeek 未返回结构化分析结果");
  }

  const finishReason = completion.choices[0]?.finish_reason;
  if (finishReason === "length") {
    throw new AnalysisError("DeepSeek 输出在达到 max_tokens 上限时被截断，未能生成完整结果");
  }
  const rawArgs = parseToolArguments(toolCall.function.arguments, "DeepSeek");

  const parsed = EpisodeAnalysisSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new AnalysisError(`DeepSeek 返回结果未通过校验：${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Local models (LM Studio) use JSON-schema structured output rather than the forced tool call
 * the cloud providers use. LM Studio constrains decoding to the schema's grammar, so the result
 * is guaranteed parseable and schema-shaped — measurably more reliable than tool-calling on a
 * local model, which is the usual failure mode for this kind of large nested output.
 */
async function callLmStudio(episodeTitle: string, segments: TranscriptSegment[] | undefined, fullText: string): Promise<EpisodeAnalysis> {
  const config = getLmStudioConfig();
  if (!config) throw new AnalysisError("未配置 LMSTUDIO_BASE_URL，无法使用本地模型");

  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  const userPrompt = buildTranscriptPrompt(episodeTitle, segments, fullText);

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: STRUCTURED_OUTPUT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "episode_analysis",
        strict: true,
        schema: ANALYSIS_TOOL_INPUT_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    max_tokens: 16000,
    // Low but non-zero: this is an extraction task, not a creative one, and greedy decoding on
    // a grammar-constrained output tends to get stuck repeating list items.
    temperature: 0.3,
  });

  if (completion.choices[0]?.finish_reason === "length") {
    throw new AnalysisError("本地模型输出在达到 max_tokens 上限时被截断，未能生成完整结果");
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new AnalysisError("本地模型未返回内容");

  const parsed = EpisodeAnalysisSchema.safeParse(parseToolArguments(content, "本地模型"));
  if (!parsed.success) {
    throw new AnalysisError(`本地模型返回结果未通过校验：${parsed.error.message}`);
  }
  return parsed.data;
}

async function callCloudProvider(
  provider: "anthropic" | "deepseek",
  episodeTitle: string,
  segments: TranscriptSegment[] | undefined,
  fullText: string
): Promise<EpisodeAnalysis> {
  const model = getAiModel(provider);
  return provider === "anthropic"
    ? callClaude(model, episodeTitle, segments, fullText)
    : callDeepSeek(model, episodeTitle, segments, fullText);
}

export async function analyzeEpisode(episodeId: string): Promise<EpisodeAnalysisRecord> {
  const episode = await episodesRepo.getEpisodeById(episodeId);
  if (!episode) throw new AnalysisError("单集不存在");

  const transcript = await transcriptsRepo.getTranscript(episodeId);
  if (!transcript || episode.transcriptStatus !== "completed") {
    throw new AnalysisError("请先完成转录，再进行 AI 分析");
  }

  await episodesRepo.updateEpisodeStatus(episodeId, { analysisStatus: "processing" });
  const job = await jobsRepo.createProcessingJob(episodeId, "analyze");

  try {
    const provider = resolveAiProvider();
    let model = provider ? getAiModel(provider) : "mock";
    let analysis: EpisodeAnalysis;

    if (provider === "lmstudio") {
      try {
        analysis = await callLmStudio(episode.title, transcript.segments, transcript.fullText);
      } catch (err) {
        // Same best-effort contract as local transcription: a stopped LM Studio server or an
        // unloaded model falls back to the cloud instead of failing the episode.
        const message = err instanceof Error ? err.message : "本地模型分析失败";
        const fallback = resolveCloudAiProvider();
        if (!fallback) throw new AnalysisError(`本地模型分析失败，且没有可用的云端兜底：${message}`);
        console.warn(`[analyze] 本地模型失败，回退到 ${fallback}：${message}`);
        model = getAiModel(fallback);
        analysis = await callCloudProvider(fallback, episode.title, transcript.segments, transcript.fullText);
      }
    } else if (provider === "anthropic" || provider === "deepseek") {
      analysis = await callCloudProvider(provider, episode.title, transcript.segments, transcript.fullText);
    } else {
      analysis = buildMockAnalysis(episode.title, transcript.fullText, transcript.segments);
    }

    const record = await analysesRepo.saveAnalysis(episodeId, analysis, model);
    await episodesRepo.updateEpisodeStatus(episodeId, { analysisStatus: "completed" });
    await jobsRepo.finishProcessingJob(job.id, { status: "completed" });
    return record;
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 分析失败";
    await episodesRepo.updateEpisodeStatus(episodeId, { analysisStatus: "failed" });
    await jobsRepo.finishProcessingJob(job.id, { status: "failed", errorMessage: message });
    throw err;
  }
}
