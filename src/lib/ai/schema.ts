/**
 * Hand-written JSON Schema mirroring src/lib/validation/analysis.ts. Used both as an Anthropic
 * tool `input_schema` and an OpenAI-style function `parameters` object (DeepSeek) — the shape
 * is plain JSON Schema either way, so the same object works for both SDKs.
 */
export const ANALYSIS_TOOL_NAME = "submit_episode_analysis";
export const ANALYSIS_TOOL_DESCRIPTION = "提交结构化的播客单集分析结果";

export const ANALYSIS_TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    oneLiner: { type: "string", description: "一句话总结整期节目的核心内容" },
    summary: { type: "string", description: "约 3 分钟阅读量的摘要（400-700字），覆盖节目主要脉络" },
    topicMap: {
      type: "object",
      description:
        "把整期节目按讨论顺序拆解成话题分支的结构化框架图（用于生成脑图），必须覆盖节目实际讨论过的内容，不能只挑几个亮点、遗漏大段讨论",
      properties: {
        centralTopic: { type: "string", description: "整期节目的中心议题，8-20 字左右" },
        branches: {
          type: "array",
          minItems: 2,
          maxItems: 24,
          description: "按讨论顺序排列的话题分支（可以理解为节目的章节/子话题），需要覆盖整期节目的完整脉络",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "该分支的标题，4-12 字左右，适合脑图节点展示" },
              summary: { type: "string", description: "该分支讨论内容的一句话概述" },
              points: {
                type: "array",
                minItems: 1,
                maxItems: 10,
                description: "该分支下的具体讨论点，尽量详细、覆盖转录中的细节和论据，不要只写结论性的一句话",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "具体讨论点，一句话，适度保留细节而不是过度概括" },
                    timestampSeconds: {
                      type: ["number", "null"],
                      description: "该讨论点最接近的转录分段起始时间（秒）。无法确认时必须为 null，禁止编造",
                    },
                  },
                  required: ["text", "timestampSeconds"],
                },
              },
            },
            required: ["title", "summary", "points"],
          },
        },
      },
      required: ["centralTopic", "branches"],
    },
    keyPoints: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 15,
      description: "5-10 条核心观点，每条一句话，独立成条",
    },
    keyData: {
      type: "array",
      items: { type: "string" },
      description: "节目中提到的重要数据（数字、百分比、金额等），逐条列出原始表述",
    },
    guestConclusions: {
      type: "array",
      items: { type: "string" },
      description: "嘉宾给出的重要结论或判断",
    },
    people: {
      type: "array",
      items: { type: "string" },
      description: "节目中提到的人物姓名（含主持人、嘉宾及被讨论的人物）",
    },
    entities: {
      type: "object",
      properties: {
        companies: { type: "array", items: { type: "string" } },
        products: { type: "array", items: { type: "string" } },
        assets: { type: "array", items: { type: "string" } },
      },
      required: ["companies", "products", "assets"],
      description: "涉及的公司、产品和资产（如股票代码、加密货币）",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 12,
      description: "1-12 个主题标签，简短的名词或名词短语",
    },
    keyQuotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quote: { type: "string", description: "转录中的原文摘录，不得改写或编造" },
          timestampSeconds: {
            type: ["number", "null"],
            description: "该原文最接近的转录分段起始时间（秒）。无法确认时必须为 null，禁止编造",
          },
          speaker: { type: ["string", "null"], description: "发言人（如转录中可辨识）" },
        },
        required: ["quote", "timestampSeconds"],
      },
      description: "3-8 条关键原文及对应时间点",
    },
    openQuestions: {
      type: "array",
      items: { type: "string" },
      description: "值得进一步研究但节目中未充分解答的问题",
    },
  },
  // Every field is required so the model always emits the key, even if the value is an empty
  // array. Benchmarking the local model found it silently dropping optional fields entirely
  // (keyData came back missing on a transcript full of figures) — an empty array it has to
  // write is a much weaker temptation to skip than a field it can omit outright. Nothing here
  // forces non-empty content, so "节目没提到数字" is still expressible as [].
  required: [
    "oneLiner",
    "summary",
    "topicMap",
    "keyPoints",
    "keyData",
    "guestConclusions",
    "people",
    "entities",
    "tags",
    "keyQuotes",
    "openQuestions",
  ],
} as const;
