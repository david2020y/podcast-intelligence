"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { Maximize2, Minimize2, ChevronsDown, ChevronsUp, Scan, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMarkmapOutline } from "@/lib/export/mindmap";
import type { TopicMap } from "@/lib/validation/analysis";

const transformer = new Transformer();

// Branches show by default; each branch's points start folded — with up to 24 branches x 10
// points, showing everything at once is what made the diagram unreadable. Click a branch (or
// "全部展开") to reveal its points.
// Note: markmap's depth counting starts at 1 for the root itself, not 0 — `initialExpandLevel: 1`
// folds the root's own children (the branches), leaving only the root visible. 2 is what
// actually means "show root + branches, fold each branch's points".
const COLLAPSED_LEVEL = 2;
const EXPANDED_LEVEL = -1;

export function MindMap({ topicMap }: { topicMap: TopicMap }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  // Markmap is a long-lived imperative instance bound to the <svg> — create it exactly once per
  // mount. (Creating it inside the topicMap-driven effect below and destroy()-ing it on every
  // change raced badly with React 19 dev-mode's double-invoked effects: Markmap.create()'s
  // internal setData() is async and un-awaited, so a destroy() firing mid-render left the SVG
  // with only its first node ever attached.)
  useEffect(() => {
    if (!svgRef.current) return;
    const mm = Markmap.create(svgRef.current, { initialExpandLevel: COLLAPSED_LEVEL, duration: 300 });
    mmRef.current = mm;
    return () => {
      mm.destroy();
      mmRef.current = null;
    };
  }, []);

  // Push new data into the existing instance whenever the topic map changes.
  useEffect(() => {
    const mm = mmRef.current;
    if (!mm) return;
    let cancelled = false;
    const { root } = transformer.transform(buildMarkmapOutline(topicMap));
    setAllExpanded(false);
    mm.setData(root, { initialExpandLevel: COLLAPSED_LEVEL }).then(() => {
      if (!cancelled) mm.fit();
    });
    return () => {
      cancelled = true;
    };
  }, [topicMap]);

  useEffect(() => {
    const timer = setTimeout(() => {
      mmRef.current?.fit();
    }, 320);
    return () => clearTimeout(timer);
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  const toggleExpandAll = useCallback(async () => {
    const next = !allExpanded;
    setAllExpanded(next);
    const { root } = transformer.transform(buildMarkmapOutline(topicMap));
    await mmRef.current?.setData(root, { initialExpandLevel: next ? EXPANDED_LEVEL : COLLAPSED_LEVEL });
    mmRef.current?.fit();
  }, [allExpanded, topicMap]);

  const fitToScreen = useCallback(() => {
    mmRef.current?.fit();
  }, []);

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-4" : "space-y-2"}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">点击节点可展开/折叠；滚轮缩放、拖拽平移</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={toggleExpandAll}>
            {allExpanded ? <ChevronsUp className="size-3.5" /> : <ChevronsDown className="size-3.5" />}
            {allExpanded ? "全部折叠" : "全部展开"}
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={fitToScreen}>
            <Scan className="size-3.5" />
            适应窗口
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            {fullscreen ? "退出全屏" : "全屏"}
          </Button>
          {fullscreen && (
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setFullscreen(false)}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <svg
        ref={svgRef}
        className={
          fullscreen
            ? "min-h-0 w-full flex-1 rounded-lg border border-border bg-card"
            : "h-[420px] w-full rounded-lg border border-border bg-card"
        }
      />
    </div>
  );
}
