import type { TranscriptSegment } from "@/lib/types";

const ROLE_AND_RULES = `你是一名专业的播客内容研究员，服务于投资、科技与 AI 领域的深度听众。
你的任务是阅读一期播客的完整转录文字，输出结构化的研究笔记。

严格规则（必须遵守）：
1. 只能依据转录文字中出现的内容，绝不能补充、推测或编造转录中没有出现的事实、数据或结论。
2. 每一条关键原文（keyQuotes）必须是转录文字中真实出现的句子或片段，不得改写、不得拼接不相邻的句子。
3. 关键原文和核心观点应尽量关联到具体时间点：时间点来自最接近该内容的转录分段起始时间（转录文字中以 [t=秒数] 标注）。如果无法确定对应的时间点，timestampSeconds 必须填 null，禁止编造一个大概的数字。
4. 如果转录中信息不完整或存在歧义，在对应字段中明确反映这种不确定性（例如在 guestConclusions 或 openQuestions 中说明"嘉宾未给出确定结论"），而不是替嘉宾下结论。
5. 输出语言为中文（人名、公司名、产品名、股票代码等专有名词保留原文）。
6. keyData 要尽量把节目里出现的具体数字（百分比、金额、增速、时间点等）逐条摘出来，保留原始表述；节目确实没有提到任何数字时才留空数组。`;

const TOPIC_MAP_GUIDANCE = `关于 topicMap（内容框架图，会渲染成脑图给用户看）：
- 这是本次分析里最重要的字段，目标是让用户不看转录、只看这张图就能重建整期节目的讨论脉络，所以必须尽量完整，不能只挑几个"亮点"就草草了事。
- 按节目实际讨论的先后顺序拆分话题分支（branches），话题切换到哪里就应该有一个新分支，宁可分支多一些、细一些，也不要把差异很大的内容硬塞进同一个分支。
- 每个分支下的 points 要保留具体的论据、数字、例子，而不是把一段讨论压缩成一句空泛的结论——keyPoints 字段已经是"精选亮点"了，topicMap 的 points 定位不同，是"这个分支里都聊了什么"，应该更详细、更接近转录的实际信息量。
- 如果某段讨论跑题、闲聊或者反复横跳，也如实按实际顺序体现，不要为了让结构好看而重新编排节目没有的逻辑顺序。
- 必须覆盖到节目结尾：最后一个分支的时间点应当接近下面给出的节目总时长。分支数量有上限，所以要把它们均匀分配到整条时间轴上——如果为了细讲开头部分把配额用完，导致后半程整段缺失，这次分析就是失败的。长节目请适当放粗每个分支的粒度，优先保证首尾完整。`;

/** For the cloud providers, which are driven by a forced tool call. */
export const ANALYSIS_SYSTEM_PROMPT = `${ROLE_AND_RULES}
7. 必须调用 submit_episode_analysis 工具返回结果，不要输出额外的文字说明。

${TOPIC_MAP_GUIDANCE}`;

/**
 * For local models (LM Studio), which are driven by grammar-constrained JSON-schema output
 * instead of tool calls — telling them to "call the tool" would contradict what the decoder
 * actually allows them to emit.
 */
export const STRUCTURED_OUTPUT_SYSTEM_PROMPT = `${ROLE_AND_RULES}
7. 直接输出符合给定 JSON Schema 的 JSON 对象，不要输出任何额外的文字说明，也不要包裹在 markdown 代码块里。

${TOPIC_MAP_GUIDANCE}`;

/**
 * Minimum span each `[t=…]`-tagged line in the prompt should cover.
 *
 * whisper.cpp segments far more finely than the cloud providers — a 33-minute episode comes back
 * as ~1100 segments averaging under two seconds each. Tagging every one of them spends thousands
 * of tokens on timestamp markers alone (~6k on that episode) and hands the model a stream of
 * sentence fragments. Merging up to a coarser span cuts that overhead by roughly 85% and reads
 * as continuous speech; 15s is still far finer than the "jump to this moment" precision the
 * timestamps are actually used for in the UI.
 */
const PROMPT_SEGMENT_MIN_SECONDS = 15;

export function mergeSegmentsForPrompt(
  segments: TranscriptSegment[]
): Array<{ startSeconds: number; text: string }> {
  const merged: Array<{ startSeconds: number; text: string }> = [];
  let startSeconds: number | null = null;
  let parts: string[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;
    if (startSeconds === null) startSeconds = segment.startSeconds;
    parts.push(text);
    if (segment.endSeconds - startSeconds >= PROMPT_SEGMENT_MIN_SECONDS) {
      merged.push({ startSeconds, text: parts.join(" ") });
      startSeconds = null;
      parts = [];
    }
  }
  if (startSeconds !== null && parts.length > 0) merged.push({ startSeconds, text: parts.join(" ") });

  return merged;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分钟` : `${m} 分钟`;
}

export function buildTranscriptPrompt(
  episodeTitle: string,
  segments: TranscriptSegment[] | undefined,
  fullText: string,
  durationSeconds?: number | null
): string {
  // Stating the total length gives the model a target to spread topicMap branches across. Without
  // it, it has no way to know how much runway is left and will happily spend its whole branch
  // budget on the opening third, silently dropping the rest of a long episode.
  const durationLine =
    durationSeconds && durationSeconds > 0
      ? `节目总时长：${formatDuration(durationSeconds)}（约 ${Math.round(durationSeconds)} 秒，最后一个话题分支的时间点应当接近这个数字）\n`
      : "";
  const header = `播客单集标题：${episodeTitle}\n${durationLine}\n以下是完整转录文字（标注了每个分段的起始时间，单位为秒）：\n\n`;
  if (segments && segments.length > 0) {
    const body = mergeSegmentsForPrompt(segments)
      .map((s) => `[t=${Math.round(s.startSeconds)}] ${s.text}`)
      .join("\n");
    return header + body;
  }
  return header + fullText;
}
