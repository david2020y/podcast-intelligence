import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertSafeUrl } from "@/lib/rss/ssrf";
import type { LocalWhisperConfig } from "@/lib/config";
import type { TranscriptSegmentInput } from "@/lib/validation/analysis";

export class LocalWhisperError extends Error {}

/** whisper.cpp's `--output-json` shape (only the fields we read). Offsets are milliseconds. */
interface WhisperJsonOutput {
  result?: { language?: string };
  transcription?: Array<{
    offsets?: { from?: number; to?: number };
    text?: string;
  }>;
}

const PROCESS_TIMEOUT_MS = 2 * 60 * 60 * 1000; // a multi-hour episode still finishes well inside this

function run(command: string, args: string[], label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new LocalWhisperError(`${label} 超时（超过 ${PROCESS_TIMEOUT_MS / 60000} 分钟）`));
    }, PROCESS_TIMEOUT_MS);

    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      // whisper.cpp and ffmpeg both write progress to stderr, so cap what we retain — we only
      // need the tail for diagnosing a failure, not the whole progress log.
      stderr = (stderr + String(d)).slice(-4000);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new LocalWhisperError(
          err && (err as NodeJS.ErrnoException).code === "ENOENT"
            ? `找不到可执行文件 ${command}（${label}）。请确认已安装并在 PATH 中，或用环境变量指定完整路径。`
            : `${label} 启动失败：${err.message}`
        )
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new LocalWhisperError(`${label} 退出码 ${code}：${stderr.slice(-800) || "(无错误输出)"}`));
    });
  });
}

/**
 * Transcribes an episode with a locally-installed whisper.cpp binary.
 *
 * ffmpeg reads the audio URL directly and streams it into the 16kHz mono WAV whisper.cpp wants,
 * which avoids buffering a multi-hundred-MB episode in memory the way the cloud sync providers
 * have to. The URL is still SSRF-checked first, since it comes from a third-party RSS feed and
 * handing an unchecked one to ffmpeg would sidestep the guard the rest of the app relies on.
 *
 * Unlike the Groq/OpenAI path there is no 25MB ceiling here — local inference has no upload
 * limit, so full-length episodes no longer have to go through AssemblyAI.
 */
/**
 * RSS feeds carry a BCP-47-ish language tag ("zh-cn", "en-US"); whisper wants the bare ISO-639-1
 * code. Anything unrecognizable falls through to auto-detection.
 */
export function normalizeWhisperLanguage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2}$/.test(code) ? code : null;
}

export async function transcribeWithLocalWhisper(
  audioUrl: string,
  config: LocalWhisperConfig,
  languageHint?: string | null
): Promise<{ fullText: string; segments: TranscriptSegmentInput[]; language: string | null }> {
  const safeUrl = await assertSafeUrl(audioUrl);
  const workDir = await mkdtemp(path.join(tmpdir(), "podcast-whisper-"));
  const wavPath = path.join(workDir, "audio.wav");
  const outPrefix = path.join(workDir, "transcript");

  try {
    await run(
      "ffmpeg",
      ["-loglevel", "error", "-i", safeUrl.toString(), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath, "-y"],
      "ffmpeg 音频转换"
    );

    const whisperArgs = [
      "-m", config.modelPath,
      "-f", wavPath,
      "-t", String(config.threads),
      "-oj",
      "-of", outPrefix,
      "-np",
    ];
    // Prefer the feed's own language tag over whisper's auto-detection: detection only looks at
    // the opening seconds, and a music-bed intro is enough to mislabel a 中文 episode as English
    // — which both mis-tags the transcript and degrades segmentation for the whole episode.
    // An explicit WHISPER_LANGUAGE overrides both; "auto" means "let whisper decide".
    const explicitLanguage = config.language && config.language !== "auto" ? config.language : null;
    const language = explicitLanguage ?? normalizeWhisperLanguage(languageHint);
    if (language) whisperArgs.push("-l", language);

    await run(config.cliPath, whisperArgs, "whisper 转录");

    const raw = await readFile(`${outPrefix}.json`, "utf8");
    const parsed = JSON.parse(raw) as WhisperJsonOutput;

    const segments: TranscriptSegmentInput[] = [];
    for (const entry of parsed.transcription ?? []) {
      const text = (entry.text ?? "").trim();
      if (!text) continue;
      segments.push({
        index: segments.length,
        startSeconds: (entry.offsets?.from ?? 0) / 1000,
        endSeconds: (entry.offsets?.to ?? 0) / 1000,
        text,
      });
    }

    if (segments.length === 0) throw new LocalWhisperError("本地转录结果为空，可能是音频无人声或解码失败");

    return {
      fullText: segments.map((s) => s.text).join(" "),
      language: parsed.result?.language ?? null,
      segments,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
