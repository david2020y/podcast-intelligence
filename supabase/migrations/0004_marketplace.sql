-- Podcast marketplace: user-added shows stay private (visible only to the adder) until an
-- admin curates them into the shared, categorized marketplace. Categories are free text
-- (not an enum) so the admin can introduce new ones without a migration.

alter table podcast_shows add column added_by_user_id uuid references auth.users (id) on delete set null;
alter table podcast_shows add column in_marketplace boolean not null default false;
alter table podcast_shows add column marketplace_category text;

create index podcast_shows_marketplace_idx on podcast_shows (marketplace_category) where in_marketplace = true;

-- One-time backfill: the catalog built while developing this app is curated content the
-- owner already vouches for, so publish it into the marketplace instead of leaving new
-- users with an empty storefront.
update podcast_shows set in_marketplace = true, marketplace_category = '宏观经济'
  where title in ('Eurodollar University', 'Hidden Forces', 'Macro Voices', 'Monetary Matters with Jack Farley');
update podcast_shows set in_marketplace = true, marketplace_category = '投资'
  where title in ('The Market Huddle', 'Top Traders Unplugged', '知行小酒馆');
update podcast_shows set in_marketplace = true, marketplace_category = '加密货币'
  where title in ('Stephan Livera Podcast', 'Unchained');
update podcast_shows set in_marketplace = true, marketplace_category = '科技'
  where title in ('张小珺Jùn｜商业访谈录', '硅谷101');
