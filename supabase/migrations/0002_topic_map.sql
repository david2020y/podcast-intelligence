-- Adds a structured topic/mind-map field to episode analyses so the UI can render an actual
-- content-framework diagram instead of only a flat highlight list. Nullable: existing analyses
-- predate this field and only get one back after being re-analyzed.
alter table episode_analyses add column topic_map jsonb;
