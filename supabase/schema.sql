create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  avatar_storage_path text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('home', 'restaurant', 'travel', 'recipe')),
  rating integer check (rating >= 1 and rating <= 5),
  notes text,
  recipe text,
  cook_time_minutes integer check (cook_time_minutes > 0 and cook_time_minutes <= 1440),
  restaurant_name text,
  city text,
  country text,
  entry_date date default current_date,
  want_to_recreate boolean default false,
  created_by uuid references auth.users(id),
  is_archived boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.food_entries
  add column if not exists cook_time_minutes integer check (cook_time_minutes > 0 and cook_time_minutes <= 1440);

alter table public.food_entries
  add column if not exists want_to_recreate boolean default false;

alter table public.food_entries
  add column if not exists is_archived boolean default false;

alter table public.food_entries
  drop constraint if exists food_entries_type_check;

alter table public.food_entries
  add constraint food_entries_type_check check (type in ('home', 'restaurant', 'travel', 'recipe'));

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  food_entry_id uuid references public.food_entries(id) on delete cascade,
  image_url text not null,
  thumbnail_url text,
  storage_path text,
  uploaded_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.food_entry_tags (
  food_entry_id uuid references public.food_entries(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (food_entry_id, tag_id)
);

alter table public.photos
  drop constraint if exists photos_food_entry_id_fkey;

alter table public.photos
  add constraint photos_food_entry_id_fkey
  foreign key (food_entry_id) references public.food_entries(id) on delete cascade;

alter table public.food_entry_tags
  drop constraint if exists food_entry_tags_food_entry_id_fkey;

alter table public.food_entry_tags
  add constraint food_entry_tags_food_entry_id_fkey
  foreign key (food_entry_id) references public.food_entries(id) on delete cascade;

alter table public.food_entry_tags
  drop constraint if exists food_entry_tags_tag_id_fkey;

alter table public.food_entry_tags
  add constraint food_entry_tags_tag_id_fkey
  foreign key (tag_id) references public.tags(id) on delete cascade;

create index if not exists food_entries_entry_date_idx on public.food_entries(entry_date desc);
create index if not exists food_entries_created_by_idx on public.food_entries(created_by);
create index if not exists photos_food_entry_id_idx on public.photos(food_entry_id);
create index if not exists food_entry_tags_tag_id_idx on public.food_entry_tags(tag_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_food_entries_updated_at on public.food_entries;
create trigger set_food_entries_updated_at
before update on public.food_entries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.food_entries enable row level security;
alter table public.photos enable row level security;
alter table public.tags enable row level security;
alter table public.food_entry_tags enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "Authenticated users can read entries" on public.food_entries;
create policy "Authenticated users can read entries"
on public.food_entries for select
to authenticated
using (true);

drop policy if exists "Public archive can read entries" on public.food_entries;
create policy "Public archive can read entries"
on public.food_entries for select
to anon
using (true);

drop policy if exists "Authenticated users can create entries" on public.food_entries;
create policy "Authenticated users can create entries"
on public.food_entries for insert
to authenticated
with check (true);

drop policy if exists "Public archive can create entries" on public.food_entries;
create policy "Public archive can create entries"
on public.food_entries for insert
to anon
with check (true);

drop policy if exists "Authenticated users can update entries" on public.food_entries;
create policy "Authenticated users can update entries"
on public.food_entries for update
to authenticated
using (true)
with check (true);

drop policy if exists "Public archive can update entries" on public.food_entries;
create policy "Public archive can update entries"
on public.food_entries for update
to anon
using (true)
with check (true);

drop policy if exists "Authenticated users can delete entries" on public.food_entries;
create policy "Authenticated users can delete entries"
on public.food_entries for delete
to authenticated
using (true);

drop policy if exists "Public archive can delete entries" on public.food_entries;
create policy "Public archive can delete entries"
on public.food_entries for delete
to anon
using (true);

drop policy if exists "Authenticated users can read photos" on public.photos;
create policy "Authenticated users can read photos"
on public.photos for select
to authenticated
using (true);

drop policy if exists "Public archive can read photos" on public.photos;
create policy "Public archive can read photos"
on public.photos for select
to anon
using (true);

drop policy if exists "Authenticated users can create photos" on public.photos;
create policy "Authenticated users can create photos"
on public.photos for insert
to authenticated
with check (true);

drop policy if exists "Public archive can create photos" on public.photos;
create policy "Public archive can create photos"
on public.photos for insert
to anon
with check (true);

drop policy if exists "Authenticated users can update photos" on public.photos;
create policy "Authenticated users can update photos"
on public.photos for update
to authenticated
using (true)
with check (true);

drop policy if exists "Public archive can update photos" on public.photos;
create policy "Public archive can update photos"
on public.photos for update
to anon
using (true)
with check (true);

drop policy if exists "Authenticated users can delete photos" on public.photos;
create policy "Authenticated users can delete photos"
on public.photos for delete
to authenticated
using (true);

drop policy if exists "Public archive can delete photos" on public.photos;
create policy "Public archive can delete photos"
on public.photos for delete
to anon
using (true);

drop policy if exists "Authenticated users can read tags" on public.tags;
create policy "Authenticated users can read tags"
on public.tags for select
to authenticated
using (true);

drop policy if exists "Public archive can read tags" on public.tags;
create policy "Public archive can read tags"
on public.tags for select
to anon
using (true);

drop policy if exists "Authenticated users can create tags" on public.tags;
create policy "Authenticated users can create tags"
on public.tags for insert
to authenticated
with check (true);

drop policy if exists "Public archive can create tags" on public.tags;
create policy "Public archive can create tags"
on public.tags for insert
to anon
with check (true);

drop policy if exists "Public archive can update tags" on public.tags;
create policy "Public archive can update tags"
on public.tags for update
to anon
using (true)
with check (true);

drop policy if exists "Authenticated users can read entry tags" on public.food_entry_tags;
create policy "Authenticated users can read entry tags"
on public.food_entry_tags for select
to authenticated
using (true);

drop policy if exists "Public archive can read entry tags" on public.food_entry_tags;
create policy "Public archive can read entry tags"
on public.food_entry_tags for select
to anon
using (true);

drop policy if exists "Authenticated users can create entry tags" on public.food_entry_tags;
create policy "Authenticated users can create entry tags"
on public.food_entry_tags for insert
to authenticated
with check (true);

drop policy if exists "Public archive can create entry tags" on public.food_entry_tags;
create policy "Public archive can create entry tags"
on public.food_entry_tags for insert
to anon
with check (true);

drop policy if exists "Authenticated users can delete entry tags" on public.food_entry_tags;
create policy "Authenticated users can delete entry tags"
on public.food_entry_tags for delete
to authenticated
using (true);

drop policy if exists "Public archive can delete entry tags" on public.food_entry_tags;
create policy "Public archive can delete entry tags"
on public.food_entry_tags for delete
to anon
using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-photos', 'food-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload food photos" on storage.objects;
create policy "Authenticated users can upload food photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'food-photos');

drop policy if exists "Public archive can upload food photos" on storage.objects;
create policy "Public archive can upload food photos"
on storage.objects for insert
to anon
with check (bucket_id = 'food-photos');

drop policy if exists "Authenticated users can read food photos" on storage.objects;
create policy "Authenticated users can read food photos"
on storage.objects for select
to authenticated
using (bucket_id = 'food-photos');

drop policy if exists "Public archive can read food photos" on storage.objects;
create policy "Public archive can read food photos"
on storage.objects for select
to anon
using (bucket_id = 'food-photos');

drop policy if exists "Authenticated users can update food photos" on storage.objects;
create policy "Authenticated users can update food photos"
on storage.objects for update
to authenticated
using (bucket_id = 'food-photos')
with check (bucket_id = 'food-photos');

drop policy if exists "Public archive can update food photos" on storage.objects;
create policy "Public archive can update food photos"
on storage.objects for update
to anon
using (bucket_id = 'food-photos')
with check (bucket_id = 'food-photos');

drop policy if exists "Authenticated users can delete food photos" on storage.objects;
create policy "Authenticated users can delete food photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'food-photos');

drop policy if exists "Public archive can delete food photos" on storage.objects;
create policy "Public archive can delete food photos"
on storage.objects for delete
to anon
using (bucket_id = 'food-photos');
