"use client";

import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/format";
import type { EpisodeTranscript } from "@/lib/types";

export function TranscriptPanel({ transcript, onSeek }: { transcript: EpisodeTranscript; onSeek: (sec: number) => void }) {
  if (!transcript.segments || transcript.segments.length === 0) {
    return <p className="whitespace-pre-line text-sm leading-relaxed">{transcript.fullText}</p>;
  }

  return (
    <div className="space-y-3">
      {transcript.segments.map((seg) => (
        <div key={seg.id} className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onSeek(seg.startSeconds)}
          >
            {formatTimestamp(seg.startSeconds)}
          </Button>
          <p className="text-sm leading-relaxed">{seg.text}</p>
        </div>
      ))}
    </div>
  );
}
