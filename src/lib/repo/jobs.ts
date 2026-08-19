import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, newId, nowIso } from "@/lib/mock/store";
import type { SyncJob, SyncJobStatus, ProcessingJob, ProcessingJobType, ProcessingStatus } from "@/lib/types";

export async function createSyncJob(showId: string | null): Promise<SyncJob> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const job: SyncJob = {
      id: newId(),
      showId,
      status: "running",
      startedAt: nowIso(),
      finishedAt: null,
      addedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errorMessage: null,
      createdAt: nowIso(),
    };
    mockStore.syncJobs.unshift(job);
    return job;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sync_jobs")
    .insert({ show_id: showId, status: "running" })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    showId: data.show_id,
    status: data.status as SyncJobStatus,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    addedCount: data.added_count,
    updatedCount: data.updated_count,
    failedCount: data.failed_count,
    errorMessage: data.error_message,
    createdAt: data.created_at,
  };
}

export async function finishSyncJob(
  id: string,
  patch: { status: SyncJobStatus; addedCount: number; updatedCount: number; failedCount: number; errorMessage?: string | null }
): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const job = mockStore.syncJobs.find((j) => j.id === id);
    if (!job) return;
    Object.assign(job, patch, { finishedAt: nowIso() });
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sync_jobs")
    .update({
      status: patch.status,
      added_count: patch.addedCount,
      updated_count: patch.updatedCount,
      failed_count: patch.failedCount,
      error_message: patch.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function listRecentSyncJobs(limit = 20): Promise<SyncJob[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.syncJobs.slice(0, limit);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    showId: d.show_id,
    status: d.status as SyncJobStatus,
    startedAt: d.started_at,
    finishedAt: d.finished_at,
    addedCount: d.added_count,
    updatedCount: d.updated_count,
    failedCount: d.failed_count,
    errorMessage: d.error_message,
    createdAt: d.created_at,
  }));
}

export async function createProcessingJob(episodeId: string, jobType: ProcessingJobType): Promise<ProcessingJob> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const job: ProcessingJob = {
      id: newId(),
      episodeId,
      jobType,
      status: "processing",
      errorMessage: null,
      startedAt: nowIso(),
      finishedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mockStore.processingJobs.unshift(job);
    return job;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("processing_jobs")
    .insert({ episode_id: episodeId, job_type: jobType, status: "processing", started_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    episodeId: data.episode_id,
    jobType: data.job_type as ProcessingJobType,
    status: data.status as ProcessingStatus,
    errorMessage: data.error_message,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function finishProcessingJob(
  id: string,
  patch: { status: ProcessingStatus; errorMessage?: string | null }
): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const job = mockStore.processingJobs.find((j) => j.id === id);
    if (!job) return;
    Object.assign(job, patch, { finishedAt: nowIso(), updatedAt: nowIso() });
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("processing_jobs")
    .update({ status: patch.status, error_message: patch.errorMessage ?? null, finished_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getLatestProcessingJob(
  episodeId: string,
  jobType: ProcessingJobType
): Promise<ProcessingJob | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return (
      mockStore.processingJobs
        .filter((j) => j.episodeId === episodeId && j.jobType === jobType)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("episode_id", episodeId)
    .eq("job_type", jobType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    episodeId: data.episode_id,
    jobType: data.job_type as ProcessingJobType,
    status: data.status as ProcessingStatus,
    errorMessage: data.error_message,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
