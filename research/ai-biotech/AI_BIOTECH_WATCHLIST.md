# AI × Biotech 观察名单（16 家）

> 更新：2026-09-23 · 配套：`AI_BIOTECH_DATABASE.csv`（完整字段）、`CATALYST_CALENDAR.md`（时间线）
> 核心问题：**哪些公司正在接近一个可能改变公司价值的关键临床验证节点？**
> ⚠️ 本文件不是投资建议。数据取自 SEC / FDA / ClinicalTrials.gov / 公司 IR 的搜索摘要；本次抓取时 sec.gov 与 IR 原文被网络代理拦截，关键数字请按文中链接回原始文件核对。

## 一、结论先行：验证节点接近度排名

| 排名 | Ticker | 市值 | 最近关键节点 | 时间 | 为何可能重估 | 主要风险 |
|---|---|---|---|---|---|---|
| 1 | **MRNA** | ~$57B | INTerpath-001 完整 P3 数据（ESMO LBA1）→ BLA | 2026-10-24 | 首个阳性的 mRNA 癌症疫苗 P3，数据可延伸到 NSCLC/膀胱/RCC | 股价年内已涨约 5 倍，大部分已计入；HR 未公布 |
| 2 | **ABSI** | ~$1.7B | ABS-201 中期毛发生长 PoC | 2H26 | 唯一临床资产，结果二元 | 非肿瘤资产；ABS-101 已失败 |
| 3 | **BDTX** | ~$0.12B（≈现金） | FDA 关键试验路径 + P2 更新 / 合作 | 2026 Q4 | 市值约等于现金；一线非经典 EGFR ORR 60%、颅内 ORR 86% | 关键试验需合作方或融资 |
| 4 | **CGEN** | ~$0.23B | COM701 MAIA-ovarian 中期 PFS | ≤2027 Q1 | 小市值 + AZ rilvegostomig 约 12 项 P3 的特许权期权 | 样本仅 60 例；rilvegostomig 读出在 2027 年之后 |
| 5 | **SDGR** | ~$2.2B | SGR-1505/3515 对外授权；zasocitinib FDA 决定（间接受益） | 2026-27 | 平台产出分子的记录最强，软件业务托底 | 从 zasocitinib 获得的份额未核实 |
| 6 | **RXRX** | ~$2.1B | REC-4881 注册路径；REC-617 联用数据 | 2H26 / 1H27 | 若 FAP 获加速路径，平台将首次得到临床验证 | $300M ATM 尚未动用，稀释风险高 |
| 7 | **RLAY** | ~$4.2B | ReDiscover-2 入组；一线 P3 启动 | 2026 底 / 2027 初 | AI 平台产出的 P3 资产，已获 BTD，PFS 11.1 个月 | topline 时间未披露；估值已反映一部分 |
| 8 | **EVAX** | ~$0.03B | EVX-01 三年数据（ESMO） | 2026-10-23~27 | AI 设计的个体化疫苗，ORR 75% | 仅 16 例、单臂；现金约 $14M，稀释风险极高 |
| 9 | **BNTX** | ~$24B | pumitamig 多项 P3、BNT323 中国上市 | 2026-27 | 净现金约占市值 75% | 个体化疫苗 CRC 试验失败，创始人离任 |
| 10 | **IMRX** | ~$0.3B | MAPKeeper 301 P3 OS | 2028 年中 | P2a 一线胰腺癌 mOS 17.3 个月（历史对照 8.5 个月） | 读出不在 18 个月窗口内；RevMed 竞争；AI 属性弱 |
| 11 | **GENB** | ~$1.5B | GB-4362 剂量爬坡；SOLAIRIA P3 | 2027 / ~2028 底 | 生成式 AI 设计的长效抗 TSLP 抗体 | 现金跑道早于 P3 读出 |
| 12 | **LTRN** | ~$0.02B | HARMONIC L858R 数据 | 2H26 | — | 持续经营警告，约 2 个季度现金 |
| — | **TEM / GH / CAI / CERT** | $1.3–22B | 财报、并购、医保覆盖 | 季度 | 数据平台，属于"卖铲人"，不押单一临床二元事件 | 估值由增长驱动，不属于临床重估逻辑 |

**剔除**：BTAI（2026-08-27 申请 Chapter 11，现为 BTAIQ）；Insilico（港股 3696.HK，不在美股范围，仅作 AI 制药标杆参考）。

## 二、筛选矩阵（✅ 满足 / ⚠️ 部分满足 / ❌ 不满足）

| Ticker | AI 真实参与发现 | 已进入人体临床 | 18 个月内数据读出 | 现金覆盖到节点 | 大市场 | 市值未充分反映 |
|---|---|---|---|---|---|---|
| MRNA | ⚠️ ML 选新抗原 | ✅ P3 | ✅ | ✅ | ✅ | ❌ |
| RLAY | ✅ Dynamo | ✅ P3 | ⚠️ | ✅ 至 2029 | ✅ | ⚠️ |
| SDGR | ✅ | ✅ P1 | ⚠️ | ✅ | ⚠️ | ⚠️ |
| RXRX | ⚠️ 老药再定位 | ✅ P2 | ✅ | ⚠️ 至 2028 初 | ⚠️ FAP 为罕见病 | ✅ |
| CGEN | ✅ 计算发现靶点 | ✅ P2 | ✅ | ✅ 至 2029 | ✅ | ✅ |
| BDTX | ⚠️ 结构计算 | ✅ P2 | ✅ | ⚠️ 不含关键试验 | ✅ | ✅ |
| ABSI | ⚠️ | ✅ P1/2a | ✅ | ✅ 至 2H28 | ✅ 脱发 | ⚠️ |
| GENB | ✅ | ✅ P3 | ❌ | ❌ | ✅ | ⚠️ |
| IMRX | ❌ | ✅ P3 | ❌ | ✅ | ✅ | ✅ |
| EVAX | ✅ | ✅ P2 | ✅ | ❌ | ✅ | ✅ |
| BNTX | ⚠️ | ✅ P3 | ✅ | ✅ | ✅ | ⚠️ |
| LTRN | ❌ | ✅ | ✅ | ❌ | ⚠️ | — |

**6 项全部 ✅ 的公司：无。** 最接近的是 **CGEN** 和 **BDTX**：两者都是小市值、有真实数据、近期有节点，但样本小或资金不足。**RLAY** 质量最高，但读出时间不明。

## 三、个股卡片（要点）

### MRNA — Moderna｜AI + Oncology
- **AI**：用 ML 算法从肿瘤测序中为每位患者选出最多 34 个新抗原。AI 用于设计，不用于发现新分子。
- **管线**：intismeran + Keytruda，INTerpath-001（NCT05933577，n=1,137）达到 RFS 与 DMFS 终点。BTD 于 2023 年授予。另有 9 项 P2/3 试验。
  - 来源：[Merck PR 2026-08-19](https://www.merck.com/news/)；5 年 P2b 数据 RFS HR 0.51（ASCO 2026）
- **现金**：$6.9B（2026-06-30）；2026 年底指引 $4.7–5.2B；目标 2028 年现金盈亏平衡。
  - 来源：[SEC 8-K Q2](https://www.sec.gov/Archives/edgar/data/0001682852/000168285226000147/exhibit9912026q2pressrelea.htm)
- **内部人**：总裁 Hoge 于 2026-09-15 卖出约 $5.9M。

### RLAY — Relay｜AI Drug Discovery
- **AI**：Dynamo 蛋白运动模拟平台。zovegalisib 是平台直接产出的突变选择性 PI3Kα 抑制剂，可避免高血糖副作用。
- **管线**：ReDiscover-2 P3（NCT06982521，对照 capivasertib）。BTD 于 2026-02-03 授予。mPFS 11.1 个月（ESMO TAT 2026-03-16）。
- **现金**：$910.9M（2026-06-30），可用至 2029。2026-05 以 $12 增发 $316M。
  - 来源：[SEC 10-Q](https://www.sec.gov/Archives/edgar/data/0001812364/000119312526338056/rlay-20260630.htm)
- **机构**：Point72 在 Q1 清仓；Casdin 增持。

### SDGR — Schrödinger｜AI Drug Discovery
- **AI**：FEP 物理模拟 + ML。平台记录包括 zasocitinib（Nimbus → Takeda，NDA 已获优先审评，2026-09-14）和 Ajax（被 Lilly 以最高 $2.3B 收购）。
- **管线**：SGR-1505（MALT1，NCT05544019，WM 适应症获 Fast Track）；SGR-3515（Wee1/Myt1，NCT06463340，DCR 65%）。公司已不再自行推进到 P2。
- **现金**：$418.8M（2026-06-30），烧钱少。
  - 来源：[SEC 10-Q](https://www.sec.gov/Archives/edgar/data/0001490978/000149097826000068/sdgr-20260630.htm)

### RXRX — Recursion｜AI Drug Discovery
- **AI**：表型组学 + CRISPR 图谱 + Exscientia 化学设计。主力 REC-4881 是 Takeda 的 TAK-733 再定位，不是平台原创分子。
- **管线**：REC-4881 FAP（NCT05552755），第 25 周息肉负荷中位数下降 53%，获 Orphan + Fast Track。
  - 肿瘤资产：REC-617 CDK7（29 例中 1 例 PR）、REC-1245、REC-3565、REC-4539。
- **现金**：$556.8M（2026-06-30），可用至 2028 初；2025 年经营现金流出 $372M。$300M ATM 尚未动用。
  - 来源：[SEC 8-K Q2](https://www.sec.gov/Archives/edgar/data/1601830/000160183026000097/exhibit991-q0226.htm)
- **事件**：2025 年裁员 20%；2026-01 起由 Najat Khan 任 CEO。

### CGEN — Compugen｜计算靶点发现
- **AI**：Unigen 平台。TIGIT、PVRIG、IL-18BP 均出自计算发现。
- **管线**：
  - COM701：MAIA-ovarian（NCT06888921）。
  - rilvegostomig（AZ PD-1×TIGIT）：约 12 项 P3，Compugen 收取中个位数特许权使用费，剩余里程碑 $195M。
  - GS-0321：Gilead，P1。
- **现金**：$125.3M，可用至 2029。2025-12 向 AZ 出售部分特许权，获 $65M + $25M。
- **同类风险**：同类 TIGIT 药物的 Phase 3 已全部失败或终止。详见 `deep-dive/CGEN.md`。
  - 来源：Compugen Q2 PR 2026-08-03

### BDTX — Black Diamond｜计算结构设计
- **管线**：silevertinib 一线非经典 EGFR NSCLC（n=43）。ORR 60%，颅内 ORR 86%，mPFS 15.2 个月（ASCO 2026 Abstract 8519）。GBM 适应症 P2（NCT07326566）。
- **耐受性风险**：200mg 下 3 级不良事件 60%、77% 患者需减量；关键试验拟改用 150mg。详见 `deep-dive/BDTX.md`。
- **现金**：$110.5M，约等于市值，可用至 2H28，但不足以覆盖关键试验。有 $150M ATM。
  - 来源：[SEC 8-K Q2](https://www.sec.gov/Archives/edgar/data/0001701541/000170154126000023/bdtx-exhibit991_q22026.htm)

### ABSI — Absci｜生成式抗体
- **管线**：ABS-201 脱发（NCT07317544），半衰期 ≥65 天；子宫内膜异位症 P2 于 2026 Q4 启动。ABS-101（TL1A）已于 2026-01 停止自研。
- **现金**：$201.1M，可用至 2H28。2026-06 以 $7.41 增发，Lilly 投入 $40M。
  - 来源：[SEC 424B5](https://www.sec.gov/Archives/edgar/data/0001672688/000119312526281131/d76291d424b5.htm)

### GENB — Generate Biomedicines｜生成式蛋白
- **IPO**：2026-02-26 定价 $16，现价约 $11.5。
- **管线**：GB-0895 长效抗 TSLP，SOLAIRIA P3（NCT07276724 / NCT07359846），topline 约 2028 年底。
  - 肿瘤：GB-4362（Fast Track）、GB-5267。
- **现金**：$457.4M，年烧约 $275M，只够用到 1H28，早于 P3 读出，必须融资。

### IMRX — Immuneering
- **管线**：atebimetinib + mGnP 一线 PDAC P2a（n=55），mOS 17.3 个月（ASCO 2026-06-01）。P3 MAPKeeper 301（NCT07562152）topline 在 2028 年中。
- **现金**：$182.7M，可用至 2029。
- **注意**：
  - AI 属性弱，属于计算生物学出身，不是 AI 发现的分子。
  - RevMed 的 daraxonrasib 已于 2026-08-26 获批二线 PDAC。

### EVAX / LTRN（微型股，高风险）
- **EVAX**：EVX-01（NCT05309421）ORR 75%（12/16），但现金仅 $14M，持续使用 ATM。
- **LTRN**：现金 $7.4M，10-Q 有持续经营警告，AI 平台主要用于老分子再定位。

### BNTX — BioNTech
- **AI**：拥有 InstaDeep，但肿瘤核心资产 pumitamig（来自 Biotheus）和 BNT323（来自 DualityBio）都是外部引进。
- **负面事件**：2026-08-28 终止 autogene cevumeran 的 CRC 试验，原因是 OS 不利。
  - 来源：[SEC 6-K](https://www.sec.gov/Archives/edgar/data/1776985/000177698526000061/a991260828_bntxxcrcxenxfin.htm)
- **资金**：现金 €16.6B，并在执行 $1B 回购。

### 数据平台（卖铲人）
- **TEM**：Q2 营收 $382.5M（+22%），Adj EBITDA 转正；xT CDx 于 2026-05-29 获批；以全股票并购 Personalis。CEO 在减持。
- **CAI**：Q2 营收 $263.7M（+45%），Adj EBITDA $55.7M；与 Genentech 合作靶点发现（最高 $1.1B）。
- **GH**：Q2 营收 $335M（+44%）；Shield 进入 ACS 指南，UnitedHealth 已覆盖；仍在烧钱，目标 2027 年底现金盈亏平衡。
- **CERT**：营收增长约 1%，CEO/CFO 更替，有律所调查。落后者。

## 四、关键洞察
1. **个体化新抗原疫苗出现分化**：MRNA 的 P3 阳性（2026-08-19），而 BNTX 的 CRC 试验因 OS 不利终止（2026-08-28）。同一技术路线结果不同，设计与适应症选择是关键。
2. **ESMO 2026（10/23–27）是短期最大的集中事件**：涉及 MRNA、EVAX、BNTX。
3. **"AI 原创分子 + P3" 目前只有两家**：RLAY（zovegalisib）和 GENB（GB-0895）。其余公司的临床资产多为老药再定位、外部引进或早期阶段。
4. **稀释风险最高**：LTRN、EVAX、GENB、RXRX、BDTX。

## 五、维护规则
- 每季度财报后更新 CSV 中的现金、烧钱和跑道。
- 每个催化剂发生后，在 `CATALYST_CALENDAR.md` 标注结果（✅/❌）。
- 加入观察名单的条件：进入人体临床，且 18 个月内有读出。
- 移出条件：现金少于 4 个季度且没有融资路径，或核心资产失败。
