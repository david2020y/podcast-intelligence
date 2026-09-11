/**
 * Local inference worker.
 *
 * Runs on the machine that hosts the models (LM Studio + whisper.cpp) and drains the same
 * Supabase the Vercel deployment serves: it picks up episodes of subscribed shows that still
 * need transcription or analysis, processes them locally, and writes the results back. The web
 * UI stays online and phone-accessible; only the heavy compute moves here.
 *
 * It reuses transcribeEpisode()/analyzeEpisode() verbatim, so local and cloud runs go through
 * exactly the same pipeline, status bookkeeping, and fallback behaviour.
 *
 *   npm run worker          # drain forever, polling when idle
 *   npm run worker -- --once  # process a single item then exit (useful for cron/testing)
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";

// The worker is a plain Node process, so nothing has loaded .env.local for it the way `next dev`
// would. Load it before importing anything that reads process.env at module scope.
loadEnv({ path: path.join(process.cwd(), ".env.local") });

const { getAppMode, getLmStudioConfig, getLocalWhisperConfig } = await import("@/lib/config");
const { findPendingWork } = await import("@/lib/repo/episodes");
const { transcribeEpisode } = await import("@/lib/transcription/transcribe");
const { analyzeEpisode } = await import("@/lib/ai/analyze");

const IDLE_POLL_MS = Number(process.env.WORKER_POLL_SECONDS || 60) * 1000;
const MAX_EPISODES_PER_SHOW = Number(process.env.WORKER_MAX_EPISODES_PER_SHOW || 20);
const runOnce = process.argv.includes("--once");

function log(message: string) {
  console.log(`[worker ${new Date().toLocaleTimeString("zh-CN")}] ${message}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(): Promise<boolean> {
  const work = await findPendingWork(MAX_EPISODES_PER_SHOW);
  if (!work) return false;

  const label = `《${work.title}》`;
  const startedAt = Date.now();
  try {
    if (work.kind === "transcribe") {
      log(`开始转录 ${label}`);
      const result = await transcribeEpisode(work.episodeId);
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      // AssemblyAI (the cloud fallback) finishes via webhook, so "processing" isn't a failure.
      log(result.status === "completed" ? `✓ 转录完成 ${label}（${elapsed}s）` : `→ 转录已提交，等待回调 ${label}`);
    } else {
      log(`开始分析 ${label}`);
      await analyzeEpisode(work.episodeId);
      log(`✓ 分析完成 ${label}（${Math.round((Date.now() - startedAt) / 1000)}s）`);
    }
  } catch (err) {
    // transcribeEpisode/analyzeEpisode already recorded the failure on the episode and its job
    // row, so the loop just logs and moves on — one bad episode must not stop the queue.
    log(`✗ ${work.kind === "transcribe" ? "转录" : "分析"}失败 ${label}：${err instanceof Error ? err.message : String(err)}`);
  }
  return true;
}

async function main() {
  const mode = getAppMode();
  if (mode.mockMode) {
    log("当前是 Mock Mode（未配置 Supabase），worker 没有真实队列可处理，退出。");
    process.exit(1);
  }

  log(`启动 · 分析后端=${mode.aiProvider ?? "未配置"} · 转录后端=${mode.transcriptionProvider ?? "未配置"}`);
  if (!getLmStudioConfig()) log("提示：未配置 LMSTUDIO_BASE_URL，分析会走云端。");
  if (!getLocalWhisperConfig()) log("提示：未配置 WHISPER_MODEL_PATH，转录会走云端。");

  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (stopping) process.exit(1); // second Ctrl-C forces out mid-episode
      stopping = true;
      log("收到退出信号，当前这集处理完就停。再按一次强制退出。");
    });
  }

  while (!stopping) {
    const didWork = await processOne();
    if (runOnce) {
      if (!didWork) log("队列为空。");
      break;
    }
    if (!didWork && !stopping) {
      log(`队列为空，${IDLE_POLL_MS / 1000}s 后再看。`);
      await sleep(IDLE_POLL_MS);
    }
  }

  log("已停止。");
}

main().catch((err) => {
  console.error("[worker] 致命错误：", err);
  process.exit(1);
});
