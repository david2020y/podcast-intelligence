// Minimal hand-written row types for the tables this app touches.
// Kept intentionally narrow (vs. full generated types) to match the MVP schema in
// supabase/migrations/0001_init.sql. Regenerate with `supabase gen types` once the
// schema stabilizes if richer typing is needed.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      podcast_shows: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          cover_url: string | null;
          author: string | null;
          rss_url: string | null;
          website_url: string | null;
          category: string | null;
          language: string | null;
          source_platform: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["podcast_shows"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["podcast_shows"]["Row"]>;
      };
      podcast_episodes: {
        Row: {
          id: string;
          show_id: string;
          guid: string;
          title: string;
          description: string | null;
          published_at: string | null;
          duration_seconds: number | null;
          audio_url: string | null;
          episode_url: string | null;
          cover_url: string | null;
          guests: string[];
          processing_status: string;
          transcript_status: string;
          analysis_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["podcast_episodes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["podcast_episodes"]["Row"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          show_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
      };
      episode_transcripts: {
        Row: {
          id: string;
          episode_id: string;
          full_text: string;
          language: string | null;
          provider: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["episode_transcripts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["episode_transcripts"]["Row"]>;
      };
      transcript_segments: {
        Row: {
          id: string;
          transcript_id: string;
          segment_index: number;
          start_seconds: number;
          end_seconds: number;
          text: string;
        };
        Insert: Partial<Database["public"]["Tables"]["transcript_segments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["transcript_segments"]["Row"]>;
      };
      episode_analyses: {
        Row: {
          id: string;
          episode_id: string;
          one_liner: string;
          summary: string;
          key_points: unknown;
          key_data: unknown;
          guest_conclusions: unknown;
          people: unknown;
          entities: unknown;
          tags: string[];
          key_quotes: unknown;
          open_questions: unknown;
          model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["episode_analyses"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["episode_analyses"]["Row"]>;
      };
      tags: {
        Row: { id: string; name: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
      };
      episode_tags: {
        Row: { episode_id: string; tag_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["episode_tags"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["episode_tags"]["Row"]>;
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["collections"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["collections"]["Row"]>;
      };
      collection_items: {
        Row: {
          id: string;
          collection_id: string;
          episode_id: string;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["collection_items"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["collection_items"]["Row"]>;
      };
      favorites: {
        Row: { user_id: string; episode_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["favorites"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["favorites"]["Row"]>;
      };
      sync_jobs: {
        Row: {
          id: string;
          show_id: string | null;
          status: string;
          started_at: string;
          finished_at: string | null;
          added_count: number;
          updated_count: number;
          failed_count: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sync_jobs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["sync_jobs"]["Row"]>;
      };
      processing_jobs: {
        Row: {
          id: string;
          episode_id: string;
          job_type: string;
          status: string;
          error_message: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["processing_jobs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["processing_jobs"]["Row"]>;
      };
    };
  };
}
