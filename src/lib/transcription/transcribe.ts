import OpenAI, { toFile } from "openai";
import {
  getAppMode,
  resolveTranscriptionProvider,
  resolveCloudTranscriptionProvider,
  getTranscriptionModel,
  getTranscriptionClientConfig,
  getLocalWhisperConfig,
  getAppBaseUrl,
  ASSEMBLYAI_WEBHOOK_HEADER_NAME,
  ASSEMBLYAI_WEBHOOK_SECRET,
} from "@/lib/config";
import { transcribeWithLocalWhisper } from "@/lib/transcription/local-whisper";
import type { CloudTranscriptionProvider } from "@/lib/config";
import { fetchSafe } from "@/lib/rss/fetchSafe";
import { submitAssemblyAiJob } from "@/lib/transcription/assemblyai";
import { extractYoutubeVideoId, fetchYoutubeCaptions } from "@/lib/youtube/captions";
import * as episodesRepo from "@/lib/repo/episodes";
import * as showsRepo from "@/lib/repo/shows";
import * as transcriptsRepo from "@/lib/repo/transcripts";
import * as jobsRepo from "@/lib/repo/jobs";
import { TranscriptSegmentSchema } from "@/lib/validation/analysis";
import type { EpisodeTranscript } from "@/lib/types";
import type { z } from "zod";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper API hard limit on both OpenAI and Groq's free tier

export class TranscriptionError extends Error {}

type SegmentInput = z.infer<typeof TranscriptSegmentSchema>;

export type TranscribeOutcome = { status: "completed"; transcript: EpisodeTranscript } | { status: "processing" };

function buildMockTranscript(episodeTitle: string, description: string | null, durationSeconds: number | null): {
  fullText: string;
  segments: SegmentInput[];
} {
  const total = durationSeconds ?? 1800;
  const sentences = [
    `本期节目标题为《${episodeTitle}》。`,
    description ? `节目简介提到：${description}` : "主持人对本期主题进行了开场介绍。",
    "这是 Mock Mode 下生成的模拟转录内容，用于演示转录到分析再到搜索、收藏、导出的完整流程。",
    "真实环境下，此处会替换为 AssemblyAI / Groq / OpenAI 转录服务返回的完整文字与分段时间戳。",
    "如需体验真实转录效果，请在环境变量中配置 ASSEMBLYAI_API_KEY、GROQ_API_KEY 或 OPENAI_API_KEY 后重新处理本集。",
  ];
  const step = Math.max(10, Math.floor(total / sentences.length));
  const segments: SegmentInput[] = sentences.map((text, i) => ({
    index: i,
    startSeconds: i * step,
    endSeconds: Math.min(total, (i + 1) * step),
    text,
  }));
  return { fullText: sentences.join("\n\n"), segments };
}

async function transcribeWithSyncProvider(
  provider: "groq" | "openai",
  audioUrl: string,
  durationSeconds: number | null
): Promise<{ fullText: string; segments: SegmentInput[]; language: string | null }> {
  const head = await fetchSafe(audioUrl, { method: "HEAD" }).catch(() => null);
  const contentLength = head?.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_AUDIO_BYTES) {
    throw new TranscriptionError(
      "音频文件超过 25MB，Groq/OpenAI 无法处理。请配置 ASSEMBLYAI_API_KEY 以支持长音频（最长 10 小时）。"
    );
  }

  const audioRes = await fetchSafe(audioUrl);
  if (!audioRes.ok) throw new TranscriptionError(`下载音频失败：HTTP ${audioRes.status}`);
  const buf = await audioRes.arrayBuffer();
  if (buf.byteLength > MAX_AUDIO_BYTES) {
    throw new TranscriptionError(
      "音频文件超过 25MB，Groq/OpenAI 无法处理。请配置 ASSEMBLYAI_API_KEY 以支持长音频（最长 10 小时）。"
    );
  }

  // Groq exposes an OpenAI-compatible /audio/transcriptions endpoint, so the same SDK works for either provider.
  const client = new OpenAI(getTranscriptionClientConfig(provider));
  const file = await toFile(Buffer.from(buf), "episode-audio.mp3");
  const result = await client.audio.transcriptions.create({
    file,
    model: getTranscriptionModel(provider),
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const verbose = result as unknown as {
    text: string;
    language?: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  };
  const segments: SegmentInput[] = (verbose.segments ?? []).map((s, i) => ({
    index: i,
    startSeconds: s.start,
    endSeconds: s.end,
    text: s.text.trim(),
  }));
  return {
    fullText: verbose.text,
    language: verbose.language ?? null,
    segments: segments.length > 0 ? segments : [{ index: 0, startSeconds: 0, endSeconds: durationSeconds ?? 0, text: verbose.text }],
  };
}

/** Submits an async AssemblyAI job and returns immediately; the webhook handler finishes the job on completion. */
async function startAssemblyAiTranscription(episodeId: string, audioUrl: string): Promise<void> {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    throw new TranscriptionError(
      "AssemblyAI 需要配置 APP_BASE_URL（或部署在 Vercel 上自动检测）才能接收转录完成的回调，请检查环境变量配置。"
    );
  }
  if (!ASSEMBLYAI_WEBHOOK_SECRET) {
    throw new TranscriptionError("请配置 ASSEMBLYAI_WEBHOOK_SECRET 环境变量，用于校验 AssemblyAI 回调请求的真实性。");
  }

  const webhookUrl = `${baseUrl}/api/webhooks/assemblyai?episodeId=${encodeURIComponent(episodeId)}`;
  await submitAssemblyAiJob({
    apiKey: process.env.ASSEMBLYAI_API_KEY!,
    audioUrl,
    webhookUrl,
    webhookAuthHeaderName: ASSEMBLYAI_WEBHOOK_HEADER_NAME,
    webhookAuthHeaderValue: ASSEMBLYAI_WEBHOOK_SECRET,
  });
}

export async function transcribeEpisode(episodeId: string): Promise<TranscribeOutcome> {
  const episode = await episodesRepo.getEpisodeById(episodeId);
  if (!episode) throw new TranscriptionError("单集不存在");

  await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "processing" });
  const job = await jobsRepo.createProcessingJob(episodeId, "transcribe");

  try {
    if (episode.show?.sourcePlatform === "youtube") {
      const videoId = episode.episodeUrl ? extractYoutubeVideoId(episode.episodeUrl) : null;
      if (!videoId) throw new TranscriptionError("无法从该单集链接中识别 YouTube 视频 ID");

      let captions: { fullText: string; segments: SegmentInput[]; language: string | null };
      try {
        captions = await fetchYoutubeCaptions(videoId);
      } catch (err) {
        throw new TranscriptionError(err instanceof Error ? err.message : "获取 YouTube 字幕失败");
      }

      const transcript = await transcriptsRepo.saveTranscript(
        episodeId,
        captions.fullText,
        captions.language,
        "youtube-captions",
        captions.segments
      );
      await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "completed" });
      await jobsRepo.finishProcessingJob(job.id, { status: "completed" });
      return { status: "completed", transcript };
    }

    const { hasTranscriptionKey } = getAppMode();
    const provider = resolveTranscriptionProvider();

    if (!hasTranscriptionKey || !provider) {
      const mock = buildMockTranscript(episode.title, episode.description, episode.durationSeconds);
      const transcript = await transcriptsRepo.saveTranscript(episodeId, mock.fullText, "zh", "mock", mock.segments);
      await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "completed" });
      await jobsRepo.finishProcessingJob(job.id, { status: "completed" });
      return { status: "completed", transcript };
    }

    if (!episode.audioUrl) throw new TranscriptionError("该单集没有可用的音频地址");

    let cloudProvider: CloudTranscriptionProvider;
    if (provider === "local-whisper") {
      try {
        // The joined episode.show ref doesn't carry `language`, and it's worth one extra read
        // here: it's what keeps whisper from mis-detecting the language (see local-whisper.ts).
        const show = await showsRepo.getShowById(episode.showId);
        const local = await transcribeWithLocalWhisper(episode.audioUrl, getLocalWhisperConfig()!, show?.language);
        const transcript = await transcriptsRepo.saveTranscript(
          episodeId,
          local.fullText,
          local.language,
          "local-whisper",
          local.segments
        );
        await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "completed" });
        await jobsRepo.finishProcessingJob(job.id, { status: "completed" });
        return { status: "completed", transcript };
      } catch (err) {
        // Local inference is best-effort: the models live on one machine, so anything from a
        // stopped server to a missing binary should degrade to the cloud path rather than fail
        // the episode outright.
        const message = err instanceof Error ? err.message : "本地转录失败";
        const fallback = resolveCloudTranscriptionProvider();
        if (!fallback) throw new TranscriptionError(`本地转录失败，且没有可用的云端兜底：${message}`);
        console.warn(`[transcribe] 本地 whisper 失败，回退到 ${fallback}：${message}`);
        cloudProvider = fallback;
      }
    } else {
      cloudProvider = provider;
    }

    if (cloudProvider === "assemblyai") {
      // Async: job submission just needs to succeed. The transcript itself, episode status,
      // and this processing job are all finished later by the webhook handler.
      await startAssemblyAiTranscription(episodeId, episode.audioUrl);
      return { status: "processing" };
    }

    const { fullText, segments, language } = await transcribeWithSyncProvider(cloudProvider, episode.audioUrl, episode.durationSeconds);
    const transcript = await transcriptsRepo.saveTranscript(episodeId, fullText, language, cloudProvider, segments);
    await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "completed" });
    await jobsRepo.finishProcessingJob(job.id, { status: "completed" });
    return { status: "completed", transcript };
  } catch (err) {
    const message = err instanceof Error ? err.message : "转录失败";
    await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "failed" });
    await jobsRepo.finishProcessingJob(job.id, { status: "failed", errorMessage: message });
    throw err;
  }
}
