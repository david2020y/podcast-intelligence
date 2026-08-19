"use client";

import { useState } from "react";
import { Network, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MindMap } from "@/components/episodes/mind-map";
import { TopicMapOutline } from "@/components/episodes/topic-map-outline";
import { formatTimestamp } from "@/lib/format";
import type { EpisodeAnalysisRecord } from "@/lib/types";

export function AnalysisPanel({ analysis, onSeek }: { analysis: EpisodeAnalysisRecord; onSeek: (sec: number) => void }) {
  const { people, entities } = analysis;
  const hasEntities = people.length > 0 || entities.companies.length > 0 || entities.products.length > 0 || entities.assets.length > 0;
  const [mapView, setMapView] = useState<"mindmap" | "outline">("mindmap");

  return (
    <div className="space-y-6">
      {analysis.topicMap && (
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">内容框架</h3>
            <div className="flex gap-1">
              <Button
                variant={mapView === "mindmap" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setMapView("mindmap")}
              >
                <Network className="size-3.5" />
                脑图
              </Button>
              <Button
                variant={mapView === "outline" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setMapView("outline")}
              >
                <List className="size-3.5" />
                列表
              </Button>
            </div>
          </div>
          <div className="mt-2">
            {mapView === "mindmap" ? (
              <MindMap topicMap={analysis.topicMap} />
            ) : (
              <TopicMapOutline topicMap={analysis.topicMap} onSeek={onSeek} />
            )}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground">一句话总结</h3>
        <p className="mt-1.5 text-sm leading-relaxed">{analysis.oneLiner}</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground">3 分钟摘要</h3>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{analysis.summary}</p>
      </section>

      {analysis.keyPoints.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">核心观点</h3>
          <ul className="mt-1.5 space-y-1.5">
            {analysis.keyPoints.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.keyData.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">重要数据</h3>
          <ul className="mt-1.5 space-y-1.5">
            {analysis.keyData.map((d, i) => (
              <li key={i} className="text-sm leading-relaxed tabular-nums">
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.guestConclusions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">嘉宾结论</h3>
          <ul className="mt-1.5 space-y-1.5">
            {analysis.guestConclusions.map((c, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasEntities && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">人物 / 公司 / 产品 / 资产</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {people.map((p) => (
              <Badge key={`p-${p}`} variant="secondary">
                {p}
              </Badge>
            ))}
            {entities.companies.map((c) => (
              <Badge key={`c-${c}`} variant="outline">
                {c}
              </Badge>
            ))}
            {entities.products.map((p) => (
              <Badge key={`pr-${p}`} variant="outline">
                {p}
              </Badge>
            ))}
            {entities.assets.map((a) => (
              <Badge key={`a-${a}`} className="font-mono text-[11px]">
                {a}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {analysis.keyQuotes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">关键原文</h3>
          <div className="mt-2 space-y-2">
            {analysis.keyQuotes.map((q, i) => (
              <blockquote key={i} className="rounded-md border-l-2 border-foreground/20 bg-secondary/40 py-2 pl-3 pr-2 text-sm leading-relaxed">
                {q.speaker && <span className="font-medium">{q.speaker}：</span>}
                {q.quote}
                {q.timestampSeconds !== null && (
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-1.5 h-auto p-0 align-baseline font-mono text-xs"
                    onClick={() => onSeek(q.timestampSeconds!)}
                  >
                    [{formatTimestamp(q.timestampSeconds)}]
                  </Button>
                )}
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {analysis.tags.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">标签</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {analysis.openQuestions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">值得进一步研究的问题</h3>
          <ul className="mt-1.5 space-y-1.5">
            {analysis.openQuestions.map((q, i) => (
              <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
