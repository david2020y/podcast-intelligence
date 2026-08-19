"use client";

import { use, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Star, Download, Loader2, RotateCcw, Sparkles, FileAudio, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { AudioPlayer, type AudioPlayerHandle } from "@/components/episodes/audio-player";
import { AnalysisPanel } from "@/components/episodes/analysis-panel";
import { TranscriptPanel } from "@/components/episodes/transcript-panel";
import { AddToCollectionDialog } from "@/components/episodes/add-to-collection-dialog";
import { CopyButton } from "@/components/copy-button";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { formatDate, formatDuration } from "@/lib/format";
import { buildAnalysisMarkdown } from "@/lib/export/markdown";
import type { PodcastEpisode, EpisodeTranscript, EpisodeAnalysisRecord } from "@/lib/types";

interface EpisodeDetailResponse {
  episode: PodcastEpisode;
  transcript: EpisodeTranscript | null;
  analysis: EpisodeAnalysisRecord | null;
}

export default function EpisodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = `/api/episodes/${id}`;
  const { data, isLoading, error } = useSWR<EpisodeDetailResponse>(key, fetcher, {
    refreshInterval: (latest) => {
      const ep = latest?.episode;
      const active = ep && (ep.transcriptStatus === "processing" || ep.analysisStatus === "processing");
      return active ? 3000 : 0;
    },
  });

  const playerRef = useRef<AudioPlayerHandle>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  function seek(sec: number) {
    playerRef.current?.seekTo(sec);
  }

  async function handleTranscribe() {
    setTranscribing(true);
    try {
      const result = await apiPost<{ status: "completed" | "processing" }>(`/api/episodes/${id}/transcribe`);
      toast.success(result.status === "completed" ? "转录完成" : "转录任务已提交，正在处理中，完成后页面会自动刷新");
      mutate(key);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "转录失败");
      mutate(key);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await apiPost(`/api/episodes/${id}/analyze`);
      toast.success("AI 分析完成");
      mutate(key);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "AI 分析失败");
      mutate(key);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFavorite() {
    setFavoriting(true);
    try {
      const { isFavorited } = await apiPost<{ isFavorited: boolean }>(`/api/episodes/${id}/favorite`);
      toast.success(isFavorited ? "已收藏" : "已取消收藏");
      mutate(key);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setFavoriting(false);
    }
  }

  function handleExport() {
    window.open(`/api/episodes/${id}/export`, "_blank");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-sm text-destructive">
        {error.status === 404 ? "单集不存在" : `加载失败：${error.message}`}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const { episode, transcript, analysis } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <Link
        href={`/podcasts/${episode.showId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {episode.show?.title ?? "返回播客"}
      </Link>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <img
              src={episode.coverUrl ?? episode.show?.coverUrl ?? "/podcast-placeholder.svg"}
              alt=""
              className="size-20 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1 className="text-lg font-semibold leading-snug">{episode.title}</h1>
              <p className="text-xs text-muted-foreground">
                {formatDate(episode.publishedAt)} · {formatDuration(episode.durationSeconds)}
                {episode.guests.length > 0 ? ` · 嘉宾：${episode.guests.join("、")}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <StatusBadge status={episode.processingStatus} label="处理" />
                <StatusBadge status={episode.transcriptStatus} label="转录" />
                <StatusBadge status={episode.analysisStatus} label="分析" />
              </div>
            </div>
          </div>

          {episode.description && <p className="text-sm text-muted-foreground">{episode.description}</p>}

          <AudioPlayer ref={playerRef} src={episode.audioUrl} title={episode.title} />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant={episode.isFavorited ? "default" : "outline"}
              size="sm"
              onClick={handleFavorite}
              disabled={favoriting}
            >
              <Star className={`size-4 ${episode.isFavorited ? "fill-current" : ""}`} />
              {episode.isFavorited ? "已收藏" : "收藏"}
            </Button>
            <AddToCollectionDialog episodeId={episode.id} />
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              导出 Markdown
            </Button>
            {episode.episodeUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={episode.episodeUrl} target="_blank" rel="noreferrer">
                  原始节目链接
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analysis">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="analysis">AI 分析</TabsTrigger>
            <TabsTrigger value="transcript">完整转录</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analysis" className="pt-4">
          {episode.transcriptStatus !== "completed" ? (
            <EmptyState
              icon={FileAudio}
              title="请先完成转录"
              description="AI 分析基于转录文字生成，请先生成转录内容。"
              action={
                <Button size="sm" onClick={handleTranscribe} disabled={transcribing || !episode.audioUrl}>
                  {transcribing ? <Loader2 className="size-4 animate-spin" /> : <FileAudio className="size-4" />}
                  生成转录
                </Button>
              }
            />
          ) : episode.analysisStatus === "completed" && analysis ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CopyButton getText={() => buildAnalysisMarkdown(analysis)} label="复制分析内容" />
              </div>
              <AnalysisPanel analysis={analysis} onSeek={seek} />
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                重新分析
              </Button>
            </div>
          ) : episode.analysisStatus === "failed" ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>AI 分析失败</AlertTitle>
                <AlertDescription>可能是网络问题或返回结果未通过校验，可以重试。</AlertDescription>
              </Alert>
              <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                重新分析
              </Button>
            </div>
          ) : episode.analysisStatus === "processing" ? (
            <EmptyState icon={Loader2} title="AI 分析中…" description="通常需要几十秒，完成后会自动刷新" />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="尚未生成 AI 分析"
              description="基于转录内容生成摘要、核心观点与关键原文"
              action={
                <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  生成 AI 分析
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="transcript" className="pt-4">
          {episode.transcriptStatus === "completed" && transcript ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CopyButton getText={() => transcript.fullText} label="复制转录全文" />
              </div>
              <TranscriptPanel transcript={transcript} onSeek={seek} />
              <Button variant="outline" size="sm" onClick={handleTranscribe} disabled={transcribing}>
                {transcribing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                重新转录
              </Button>
            </div>
          ) : episode.transcriptStatus === "failed" ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>转录失败</AlertTitle>
                <AlertDescription>音频可能无法访问或超出大小限制，可以重试。</AlertDescription>
              </Alert>
              <Button size="sm" onClick={handleTranscribe} disabled={transcribing}>
                {transcribing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                重新转录
              </Button>
            </div>
          ) : episode.transcriptStatus === "processing" ? (
            <EmptyState icon={Loader2} title="转录中…" description="音频较长时可能需要几分钟，完成后会自动刷新" />
          ) : (
            <EmptyState
              icon={FileAudio}
              title="尚未生成转录"
              description="将音频转换为带时间点的文字内容"
              action={
                <Button size="sm" onClick={handleTranscribe} disabled={transcribing || !episode.audioUrl}>
                  {transcribing ? <Loader2 className="size-4 animate-spin" /> : <FileAudio className="size-4" />}
                  生成转录
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
