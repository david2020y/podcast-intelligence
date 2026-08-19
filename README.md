# 播客情报库 · Podcast Intelligence

把一两个小时的播客，变成几分钟能读完、可检索、可引用、可导出的结构化研究笔记。

技术栈：Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + RLS) · Anthropic Claude/DeepSeek · AssemblyAI/Groq/OpenAI Transcription · Zod。

---

## 目录

- [快速开始](#快速开始)
- [Mock Mode（无需任何密钥）](#mock-mode无需任何密钥)
- [Supabase 配置](#supabase-配置)
- [AI 与转录 API 配置](#ai-与转录-api-配置)
- [Vercel 部署](#vercel-部署)
- [Vercel Cron 定时同步](#vercel-cron-定时同步)
- [核心流程](#核心流程)
- [项目结构](#项目结构)
- [测试与检查](#测试与检查)
- [已完成功能](#已完成功能)
- [使用 Mock 数据的部分](#使用-mock-数据的部分)
- [已知限制 / 下一阶段建议](#已知限制--下一阶段建议)

---

## 快速开始

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。**不需要配置任何环境变量即可完整体验产品** —— 系统会自动进入 Mock Mode，使用内置的 3 个示例播客、10 期示例单集、2 份完整转录与 AI 分析、2 个专题收藏进行演示，并且真实执行 RSS 抓取与解析（只有数据库存储、AI 分析、音频转录会在没有配置对应密钥时使用模拟实现）。

## Mock Mode（无需任何密钥）

当以下任一条件成立时，系统自动切换到对应的 Mock 实现（见 [src/lib/config.ts](src/lib/config.ts)）：

| 缺少的配置 | 影响范围 | Mock 行为 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 任一缺失 | 所有数据存储 | 使用进程内内存存储（[src/lib/mock/store.ts](src/lib/mock/store.ts)），预置演示数据，支持完整的增删改查、状态流转 |
| `ANTHROPIC_API_KEY` 和 `DEEPSEEK_API_KEY` 都缺失 | AI 分析 | 基于转录文字生成启发式的演示分析（明确标注为 Mock，不会假装是真实 AI 结果） |
| `ASSEMBLYAI_API_KEY` / `GROQ_API_KEY` / `OPENAI_API_KEY` 都缺失 | 音频转录 | 生成结构化的演示转录文本与分段时间戳 |

**RSS 订阅与同步不受 Mock Mode 影响** —— 无论是否配置数据库，添加 RSS 地址都会真实抓取、解析并展示播客与单集信息（已用 NPR《Planet Money》等真实播客验证）。这样即使在完全离线开发阶段，你也能验证"添加 RSS → 同步 → 查看单集"这条主链路的真实解析逻辑，只有落库环节是内存模拟。

设置页（`/settings`）会显示当前每一项服务的连接状态，密钥本身不会被展示。

## Supabase 配置

1. 在 [supabase.com](https://supabase.com) 创建一个新项目。
2. 在项目设置 → API 中获取 `Project URL`、`anon public key`、`service_role key`。
3. 安装 Supabase CLI 并关联项目（或直接在 Dashboard 的 SQL Editor 中执行迁移文件）：

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   这会应用 [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)，创建全部数据表、索引、RLS 策略、全文搜索函数与触发器。

4. 登录方式为**手机号+密码**（`/login`），不依赖任何短信服务商：注册时用手机号推导出一个占位邮箱（`p<手机号>@phone.podcast-intel.local`）通过 Supabase Admin API 直接创建已确认账号，真实手机号存在 `auth.users.user_metadata` 和 `profiles.phone`。想限制成小范围邀请制测试，设置 `SIGNUP_INVITE_CODE`（见下），注册时必须填对邀请码。
5. 将三个变量写入 `.env.local`（参考 `.env.example`）：

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
   SUPABASE_SERVICE_ROLE_KEY=xxxx
   ```

6. 重启 `npm run dev`，Mock Mode 会自动关闭，Dashboard 右上角会显示"已连接 Supabase"。

### 数据模型要点

- `podcast_shows` / `podcast_episodes` 等目录表的写入仅通过服务端 `service_role` 客户端完成（RSS 同步、转录、AI 分析）；RLS 层面对所有登录用户可读，实际的"我的播客 / 播客市场"可见性边界在应用层（`src/lib/repo/shows.ts` 的 `listMyShows` / `listMarketplaceShows`）而非 RLS 强制——见下方「播客市场」一节。
- `subscriptions` / `collections` / `collection_items` / `favorites` 是用户私有数据，通过 RLS 按 `user_id = auth.uid()` 隔离。
- `podcast_episodes` 使用 `unique (show_id, guid)` 约束保证同步幂等，不会产生重复单集。
- 全文搜索通过 `search_episodes(query, limit)` SQL 函数完成，跨 `podcast_episodes` / `podcast_shows` / `episode_analyses` / `episode_transcripts` 四张表的 `tsvector` 生成列做加权排序。

### 播客市场（我的播客 vs. 播客市场）

- `podcast_shows` 新增三列（[0004_marketplace.sql](supabase/migrations/0004_marketplace.sql)）：`added_by_user_id`（谁添加的）、`in_marketplace`（是否已上架市场，默认 `false`）、`marketplace_category`（市场分类，自由文本，不是枚举，方便后台随时加新分类不用改表结构）。
- **我的播客**（`/podcasts`）= 当前用户已订阅（`subscriptions` 状态 active/paused）的播客，自己添加的 RSS/单集/手动播客只有自己能看到。
- **播客市场**（`/marketplace`）= `in_marketplace = true` 的播客，所有登录用户可见，按 `marketplace_category` 筛选，一键"加入我的播客"。
- 用户在「我的播客」自己添加的播客**不会自动出现在市场里**——`in_marketplace` 默认 `false`，需要管理员在后台把它标记为上架并分类。当前版本还没有后台管理界面，需要单独跟进（见下方「已知限制」）。

## AI 与转录 API 配置

```bash
# AI 分析二选一，都配置时优先用 Claude
ANTHROPIC_API_KEY=sk-ant-xxxx
CLAUDE_MODEL=claude-sonnet-4-5        # 可选，默认值如左
DEEPSEEK_API_KEY=                     # https://platform.deepseek.com，每 token 价格比 Claude 便宜约 20~50 倍
DEEPSEEK_MODEL=deepseek-v4-pro        # 可选，默认值如左（deepseek-v4-flash 更便宜但准确率稍低）
AI_PROVIDER=                          # 可选：anthropic | deepseek，不填按上面两个 key 自动选择

# 转录服务三选一，都配置时优先用 AssemblyAI
ASSEMBLYAI_API_KEY=                   # https://www.assemblyai.com，支持最长 10 小时 / 5GB，URL 直连
ASSEMBLYAI_WEBHOOK_SECRET=            # 用 AssemblyAI 时必填，openssl rand -hex 32 生成一个随机值即可
APP_BASE_URL=                         # 可选；Vercel 上会自动探测，本地/自建部署需要手动填
GROQ_API_KEY=gsk_xxxx                 # https://console.groq.com/keys，便宜，但单文件限 25MB/100MB
OPENAI_API_KEY=sk-xxxx                # https://platform.openai.com/api-keys，单文件限 25MB
TRANSCRIPTION_PROVIDER=               # 可选：assemblyai | groq | openai，不填按上面几个 key 自动选择
TRANSCRIPTION_MODEL=                  # 可选，仅对 Groq/OpenAI 生效；默认 Groq 用 whisper-large-v3，OpenAI 用 whisper-1
```

- AI 分析（[src/lib/ai/analyze.ts](src/lib/ai/analyze.ts)）通过 **Tool / Function Calling（强制工具调用）** 获取结构化 JSON，输出经 Zod（[src/lib/validation/analysis.ts](src/lib/validation/analysis.ts)）校验后才写入数据库；系统提示明确要求"只依据转录文字，禁止编造，无法确认的时间点必须为 null"。Claude 走 Anthropic 的 tool_use，DeepSeek 走 OpenAI 兼容的 function calling（[src/lib/ai/schema.ts](src/lib/ai/schema.ts) 里同一份 JSON Schema 两边通用），选哪个由 `resolveAiProvider`（[src/lib/config.ts](src/lib/config.ts)）决定。
- **AssemblyAI（[src/lib/transcription/assemblyai.ts](src/lib/transcription/assemblyai.ts)）走异步流程**：提交时直接传单集的音频 URL（不需要我们自己下载/上传），立即返回；AssemblyAI 处理完成后通过 Webhook（[src/app/api/webhooks/assemblyai/route.ts](src/app/api/webhooks/assemblyai/route.ts)，用共享密钥请求头校验来源）通知我们再落库。这样不管音频多长都不会撞上 Vercel 无服务器函数的执行时长限制。开启说话人分离（`speaker_labels`），转录分段会带上"发言人 A/B"标签。
- **Groq / OpenAI 走同步流程**（[src/lib/transcription/transcribe.ts](src/lib/transcription/transcribe.ts)）：`verbose_json` + `timestamp_granularities: ["segment"]` 获取分段时间戳；单文件超过 25MB 会返回明确错误提示（建议改配 AssemblyAI 处理长音频），不做静默截断。
- 三者都会在 `processing_jobs` 表中记录一次处理尝试，失败后可以在单集详情页点击"重新转录 / 重新分析"重试。

## Vercel 部署

```bash
npm i -g vercel   # 或使用 Vercel Dashboard 导入 Git 仓库
vercel
```

在 Vercel 项目设置 → Environment Variables 中配置 `.env.example` 中列出的全部变量。构建命令、输出目录使用 Next.js 默认值即可，无需额外配置。

## Vercel Cron 定时同步

项目根目录已包含 `vercel.json`（也可以改为在 Vercel Dashboard → Cron Jobs 中配置）：

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" }
  ]
}
```

> Vercel **Hobby（免费）计划的 Cron Job 限制为每天最多触发一次**，`0 3 * * *` 即每天 UTC 3:00（北京时间 11:00）同步一次。升级到 Pro 计划后可以改成更高频率，例如 `0 */6 * * *`（每 6 小时一次）。

Vercel Cron 触发时会自带 `Authorization: Bearer $CRON_SECRET` 请求头（需要你在环境变量中配置 `CRON_SECRET`，Vercel 会自动注入）。若未配置 `CRON_SECRET`，该接口会直接拒绝所有请求（fail-closed），不会退化为无鉴权的公开接口。也可以手动测试：

```bash
curl -X POST https://your-app.vercel.app/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 核心流程

添加 RSS → 同步节目 → 查看单集 → 生成转录 → AI 分析 → 全局搜索 → 收藏到专题 → 导出 Markdown。

这条主链路已经在 Mock Mode 下用真实的公开 RSS 源（NPR *Planet Money*、中文播客《硅谷101》《张小珺｜商业访谈录》等）完整验证：添加后自动抓取全部历史单集、重复同步不产生重复数据、转录与分析状态正确流转、搜索命中标题/摘要/转录全文、收藏专题与备注正常读写、导出的 Markdown 包含完整结构化内容。

## 项目结构

```
src/
  app/                    # App Router 页面与 API 路由
    api/                  # 所有后端接口（podcasts / episodes / search / collections / cron ...）
    podcasts, episodes,   # 页面：播客列表/详情、单集详情、搜索、专题收藏、设置
    search, collections,
    settings, login
  components/
    ui/                   # shadcn/ui 基础组件
    layout/                podcasts/ episodes/ collections/  # 业务组件
  lib/
    repo/                 # 数据访问层：每个领域一个文件，内部按 Mock/真实模式分支
    rss/                  # RSS 抓取、解析、同步、SSRF 防护
    ai/                   # Claude/DeepSeek 分析：Prompt、JSON Schema、调用与校验
    transcription/        # AssemblyAI（异步）+ Groq/OpenAI（同步，同一套 OpenAI 兼容 SDK）转录
    export/                markdown 导出
    validation/            Zod schema
    supabase/              server / browser / admin 三种客户端
    mock/                  演示数据与内存存储
supabase/
  migrations/0001_init.sql
tests/                    # Vitest 单元测试
```

业务逻辑集中在 `src/lib/` 中，页面组件只负责数据获取（SWR）与展示，不直接操作数据库或调用第三方 API。

## 测试与检查

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit（严格模式）
npm run test        # Vitest
npm run build       # 生产构建
```

测试覆盖：AI 分析结果的 Zod 校验（含"禁止编造时间点"的规则）、SSRF 防护（内网 IP / 元数据地址 / 非法协议均被拒绝）、RSS 解析（真实 XML 结构、`itunes:duration` 多种格式、HTML 简介清洗、"ft. 嘉宾"标题约定提取）、Markdown 导出内容完整性、Mock 仓储层的同步幂等性与收藏状态切换。

## 已完成功能

- **播客订阅**：RSS 地址 / 单集链接自动发现 RSS / 手动添加三种方式；同步幂等（`show_id + guid` 唯一约束），重复同步不产生重复单集
- **播客与单集管理**：完整的元数据模型（封面、主持人、分类、语言、来源平台等），单集独立追踪处理/转录/分析三种状态
- **自动同步**：单播客同步、全部同步、受 `CRON_SECRET` 保护的定时同步接口，`sync_jobs` 记录每次同步的成功/失败数量
- **音频转录**：AssemblyAI / Groq / OpenAI 三选一（自动按已配置的 key 选择，AssemblyAI 优先），AssemblyAI 走异步 Webhook 支持长音频，保存全文与带时间戳的分段，失败可重试，`processing_jobs` 记录处理历史
- **AI 内容分析**：Anthropic Claude / DeepSeek 二选一（自动按已配置的 key 选择，Claude 优先，可通过 `AI_PROVIDER` 强制切换以对比两边输出质量），结构化输出一句话总结、3 分钟摘要、核心观点、重要数据、嘉宾结论、人物/公司/产品/资产、标签、关键原文+时间点、待研究问题；全部基于 Zod 校验后入库
- **全文搜索**：PostgreSQL 全文搜索（`tsvector` + `ts_rank`），覆盖标题/简介/嘉宾/转录全文/AI 摘要/核心观点/标签，支持播客/嘉宾/标签/来源平台/处理状态/收藏筛选
- **专题收藏**：新建/编辑专题、加入单集并添加备注、移除
- **Markdown 导出**：包含完整节目信息、摘要、核心观点、关键数据、关键原文与时间点、原始链接、用户备注
- **7 个核心页面**：Dashboard、播客列表、播客详情、单集详情（含播放器时间点跳转）、全局搜索、专题收藏、设置
- **安全**：RSS/音频 URL 抓取前做 SSRF 防护（拒绝内网地址、云元数据端点、非 http/https 协议，且逐跳校验重定向目标）；密钥仅通过服务端环境变量读取
- **深色/浅色模式**、响应式布局（桌面/移动端）、加载骨架屏、空状态、错误边界、Toast 反馈

## 使用 Mock 数据的部分

以下功能在未配置对应密钥时使用明确标注的模拟实现，配置密钥后重新处理即可获得真实结果，不影响其余功能的真实性：

- **AI 分析**（`ANTHROPIC_API_KEY` 与 `DEEPSEEK_API_KEY` 均未配置时）：基于真实转录文字做启发式摘要，结果中会明确写出"Mock Mode 生成"字样
- **音频转录**（`GROQ_API_KEY` 与 `OPENAI_API_KEY` 均未配置时）：生成结构化的演示文字与时间戳，不会尝试下载真实音频
- **数据存储**（无 Supabase 配置时）：使用进程内内存存储，重启服务后重置为初始演示数据

RSS 抓取解析、SSRF 防护、Markdown 导出、全文搜索（Mock Mode 下退化为应用层字符串匹配，逻辑等价）等均为真实实现。

## 已知限制 / 下一阶段建议

- Apple Podcasts / Spotify / 小宇宙 / YouTube 的官方 API 或稳定抓取集成（当前仅支持标准 RSS，及从单集页面自动发现 `<link rel="alternate" type="application/rss+xml">`）
- 音频转录目前限制单文件 25MB（Groq/OpenAI 免费层限制），尚未实现长音频自动分段转录
- Markdown 导出已完成，PDF / Word 导出留待下一阶段
- 全文搜索目前基于 PostgreSQL `tsvector`，尚未引入向量检索（语义搜索）
- 设置页的"自动同步开关"目前是只读状态展示（自动同步通过 Vercel Cron 在服务端配置），可以在下一阶段加入按播客粒度的同步频率配置
- `middleware.ts` 使用的是 Next.js 16 即将废弃的中间件约定（功能不受影响，构建时会有一条 deprecation 提示，可用 `npx @next/codemod@canary middleware-to-proxy .` 迁移到新的 `proxy.ts` 约定）
- 播客市场目前没有后台管理界面——把用户添加的播客标记为上架/下架、设置分类，暂时只能直连 Supabase 手动改 `podcast_shows` 表。后台管理是下一阶段要单独跟进的任务。
