-- Phone + password login: accounts are created with a synthetic email
-- (`p<phone>@phone.podcast-intel.local`) via the admin API, so no SMS provider is
-- required. The real phone number is kept in auth.users.raw_user_meta_data and
-- mirrored into profiles.phone for display/uniqueness.

alter table profiles add column phone text;

create unique index profiles_phone_unique on profiles (phone) where phone is not null;

create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, email, phone)
  values (new.id, new.email, new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
