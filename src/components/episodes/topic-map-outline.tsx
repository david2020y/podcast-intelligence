import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/format";
import type { TopicMap } from "@/lib/validation/analysis";

export function TopicMapOutline({ topicMap, onSeek }: { topicMap: TopicMap; onSeek: (sec: number) => void }) {
  return (
    <div className="space-y-4">
      {topicMap.branches.map((branch, i) => (
        <div key={i}>
          <p className="text-sm font-semibold">
            {i + 1}. {branch.title}
          </p>
          <p className="text-xs text-muted-foreground">{branch.summary}</p>
          <ul className="mt-1.5 space-y-1 border-l border-border pl-3">
            {branch.points.map((point, j) => (
              <li key={j} className="flex gap-1.5 text-sm leading-relaxed">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                <span>
                  {point.text}
                  {point.timestampSeconds !== null && (
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-1 h-auto p-0 align-baseline font-mono text-xs"
                      onClick={() => onSeek(point.timestampSeconds!)}
                    >
                      [{formatTimestamp(point.timestampSeconds)}]
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
