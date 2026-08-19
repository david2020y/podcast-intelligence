-- Podcast Intelligence / 播客情报库
-- Initial schema: catalog tables (shared), user-scoped tables (RLS), jobs, search.

create extension if not exists "pgcrypto";

create type processing_status as enum ('pending', 'processing', 'completed', 'failed');
create type source_platform as enum ('rss', 'apple_podcasts', 'spotify', 'xiaoyuzhou', 'youtube', 'manual');
create type subscription_status as enum ('active', 'paused');
create type sync_job_status as enum ('pending', 'running', 'completed', 'failed');
create type processing_job_type as enum ('transcribe', 'analyze');

-- Postgres marks the builtin array_to_string as STABLE (not IMMUTABLE), so it can't be
-- referenced directly inside a `generated always as (...) stored` expression. This wrapper
-- re-declares it immutable, which is safe here: we only use it to join plain-text arrays
-- (guest names, tags) for full-text search, where locale-dependent formatting is irrelevant.
create or replace function immutable_array_to_string(arr text[], sep text)
returns text as $$
  select array_to_string(arr, sep);
$$ language sql immutable parallel safe;

-- =========================================================================
-- profiles
-- =========================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- podcast_shows (shared catalog)
-- =========================================================================
create table podcast_shows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  author text,
  rss_url text unique,
  website_url text,
  category text,
  language text,
  source_platform source_platform not null default 'rss',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored
);
create index idx_shows_search on podcast_shows using gin (search_vector);
create index idx_shows_category on podcast_shows (category);

-- =========================================================================
-- podcast_episodes
-- =========================================================================
create table podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references podcast_shows (id) on delete cascade,
  guid text not null,
  title text not null,
  description text,
  published_at timestamptz,
  duration_seconds integer,
  audio_url text,
  episode_url text,
  cover_url text,
  guests text[] not null default '{}',
  processing_status processing_status not null default 'pending',
  transcript_status processing_status not null default 'pending',
  analysis_status processing_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', immutable_array_to_string(guests, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  constraint uq_episode_feed_guid unique (show_id, guid)
);
create index idx_episodes_show on podcast_episodes (show_id);
create index idx_episodes_published on podcast_episodes (published_at desc);
create index idx_episodes_search on podcast_episodes using gin (search_vector);
create index idx_episodes_processing_status on podcast_episodes (processing_status);
create index idx_episodes_transcript_status on podcast_episodes (transcript_status);
create index idx_episodes_analysis_status on podcast_episodes (analysis_status);
create index idx_episodes_guests on podcast_episodes using gin (guests);

-- =========================================================================
-- subscriptions (user-scoped)
-- =========================================================================
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  show_id uuid not null references podcast_shows (id) on delete cascade,
  status subscription_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_subscription unique (user_id, show_id)
);
create index idx_subscriptions_user on subscriptions (user_id);

-- =========================================================================
-- episode_transcripts
-- =========================================================================
create table episode_transcripts (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null unique references podcast_episodes (id) on delete cascade,
  full_text text not null default '',
  language text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(full_text, ''))
  ) stored
);
create index idx_transcripts_search on episode_transcripts using gin (search_vector);

create table transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references episode_transcripts (id) on delete cascade,
  segment_index integer not null,
  start_seconds numeric(10, 2) not null,
  end_seconds numeric(10, 2) not null,
  text text not null,
  constraint uq_segment_order unique (transcript_id, segment_index)
);
create index idx_segments_transcript on transcript_segments (transcript_id, segment_index);

-- =========================================================================
-- episode_analyses
-- =========================================================================
create table episode_analyses (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null unique references podcast_episodes (id) on delete cascade,
  one_liner text not null,
  summary text not null,
  key_points jsonb not null default '[]',
  key_data jsonb not null default '[]',
  guest_conclusions jsonb not null default '[]',
  people jsonb not null default '[]',
  entities jsonb not null default '{"companies":[],"products":[],"assets":[]}',
  tags text[] not null default '{}',
  key_quotes jsonb not null default '[]',
  open_questions jsonb not null default '[]',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (
    coalesce(one_liner, '') || ' ' || coalesce(summary, '')
  ) stored,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(one_liner, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', immutable_array_to_string(tags, ' ')), 'B')
  ) stored
);
create index idx_analyses_search on episode_analyses using gin (search_vector);
create index idx_analyses_tags on episode_analyses using gin (tags);

-- =========================================================================
-- tags / episode_tags
-- =========================================================================
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table episode_tags (
  episode_id uuid not null references podcast_episodes (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (episode_id, tag_id)
);
create index idx_episode_tags_tag on episode_tags (tag_id);

-- =========================================================================
-- collections (user-scoped)
-- =========================================================================
create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_collections_user on collections (user_id);

create table collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  episode_id uuid not null references podcast_episodes (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint uq_collection_item unique (collection_id, episode_id)
);
create index idx_collection_items_collection on collection_items (collection_id);
create index idx_collection_items_episode on collection_items (episode_id);

-- =========================================================================
-- favorites (user-scoped, lightweight star separate from collections)
-- =========================================================================
create table favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references podcast_episodes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

-- =========================================================================
-- sync_jobs
-- =========================================================================
create table sync_jobs (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references podcast_shows (id) on delete cascade,
  status sync_job_status not null default 'pending',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  added_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);
create index idx_sync_jobs_show on sync_jobs (show_id);
create index idx_sync_jobs_created on sync_jobs (created_at desc);

-- =========================================================================
-- processing_jobs (transcription / analysis attempts, drives retry + status)
-- =========================================================================
create table processing_jobs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references podcast_episodes (id) on delete cascade,
  job_type processing_job_type not null,
  status processing_status not null default 'pending',
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_processing_jobs_episode on processing_jobs (episode_id, job_type);
create index idx_processing_jobs_status on processing_jobs (status);

-- =========================================================================
-- updated_at trigger helper
-- =========================================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_shows_updated before update on podcast_shows for each row execute function set_updated_at();
create trigger trg_episodes_updated before update on podcast_episodes for each row execute function set_updated_at();
create trigger trg_subscriptions_updated before update on subscriptions for each row execute function set_updated_at();
create trigger trg_transcripts_updated before update on episode_transcripts for each row execute function set_updated_at();
create trigger trg_analyses_updated before update on episode_analyses for each row execute function set_updated_at();
create trigger trg_collections_updated before update on collections for each row execute function set_updated_at();
create trigger trg_processing_jobs_updated before update on processing_jobs for each row execute function set_updated_at();

-- =========================================================================
-- new user -> profile bootstrap
-- =========================================================================
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================================
-- combined full-text search function
-- =========================================================================
create or replace function search_episodes(p_query text, p_limit int default 30)
returns table (
  episode_id uuid,
  rank real,
  matched_in text[]
) as $$
  with q as (
    select websearch_to_tsquery('simple', p_query) as tsq
  )
  select
    e.id as episode_id,
    (
      coalesce(ts_rank(e.search_vector, q.tsq), 0) * 3 +
      coalesce(ts_rank(s.search_vector, q.tsq), 0) * 3 +
      coalesce(ts_rank(a.search_vector, q.tsq), 0) * 2 +
      coalesce(ts_rank(t.search_vector, q.tsq), 0) * 1
    )::real as rank,
    array_remove(array[
      case when e.search_vector @@ q.tsq then 'episode' end,
      case when s.search_vector @@ q.tsq then 'show' end,
      case when a.search_vector @@ q.tsq then 'analysis' end,
      case when t.search_vector @@ q.tsq then 'transcript' end
    ], null) as matched_in
  from podcast_episodes e
  join podcast_shows s on s.id = e.show_id
  left join episode_analyses a on a.episode_id = e.id
  left join episode_transcripts t on t.episode_id = e.id
  cross join q
  where q.tsq is not null and (
    e.search_vector @@ q.tsq or
    s.search_vector @@ q.tsq or
    a.search_vector @@ q.tsq or
    t.search_vector @@ q.tsq
  )
  order by rank desc
  limit p_limit;
$$ language sql stable;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table profiles enable row level security;
alter table podcast_shows enable row level security;
alter table podcast_episodes enable row level security;
alter table subscriptions enable row level security;
alter table episode_transcripts enable row level security;
alter table transcript_segments enable row level security;
alter table episode_analyses enable row level security;
alter table tags enable row level security;
alter table episode_tags enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;
alter table favorites enable row level security;
alter table sync_jobs enable row level security;
alter table processing_jobs enable row level security;

-- profiles: only owner
create policy profiles_select_own on profiles for select using (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id);

-- catalog tables: readable by any authenticated user, writes via service role only
create policy shows_select_authenticated on podcast_shows for select using (auth.role() = 'authenticated');
create policy episodes_select_authenticated on podcast_episodes for select using (auth.role() = 'authenticated');
create policy transcripts_select_authenticated on episode_transcripts for select using (auth.role() = 'authenticated');
create policy segments_select_authenticated on transcript_segments for select using (auth.role() = 'authenticated');
create policy analyses_select_authenticated on episode_analyses for select using (auth.role() = 'authenticated');
create policy tags_select_authenticated on tags for select using (auth.role() = 'authenticated');
create policy episode_tags_select_authenticated on episode_tags for select using (auth.role() = 'authenticated');
create policy sync_jobs_select_authenticated on sync_jobs for select using (auth.role() = 'authenticated');
create policy processing_jobs_select_authenticated on processing_jobs for select using (auth.role() = 'authenticated');

-- subscriptions: owner only
create policy subscriptions_all_own on subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- collections: owner only
create policy collections_all_own on collections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- collection_items: via parent collection ownership
create policy collection_items_all_own on collection_items for all
  using (exists (
    select 1 from collections c where c.id = collection_items.collection_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from collections c where c.id = collection_items.collection_id and c.user_id = auth.uid()
  ));

-- favorites: owner only
create policy favorites_all_own on favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
