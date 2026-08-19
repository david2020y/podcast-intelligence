"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface AudioPlayerHandle {
  seekTo: (seconds: number) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, { src: string | null; title: string }>(function AudioPlayer(
  { src, title },
  ref
) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = seconds;
      el.play().catch(() => {});
    },
  }));

  if (!src) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">暂无音频地址</div>;
  }

  return (
    <audio ref={audioRef} controls preload="none" className="w-full" aria-label={title}>
      <source src={src} />
      您的浏览器不支持音频播放。
    </audio>
  );
});
