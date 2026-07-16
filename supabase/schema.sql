create extension if not exists pgcrypto;

create table if not exists profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  display_name text not null default 'Sage',
  headline text,
  bio text,
  avatar_url text,
  email text,
  instagram_url text,
  linkedin_url text,
  xiaohongshu_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  code text not null,
  name text not null,
  term text,
  slot text,
  category text,
  uoc integer default 6,
  status text not null default '计划中',
  notes text,
  handbook_url text,
  timetable_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  due_date date,
  status text not null default '未开始',
  progress integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists study_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  author text,
  course_code text,
  term text,
  format text not null default 'link',
  file_path text,
  file_name text,
  file_size bigint not null default 0,
  source_url text,
  source_type text,
  status text not null default '待读',
  progress integer not null default 0 check (progress between 0 and 100),
  notes text,
  tags text[] not null default '{}',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  company text not null,
  position text,
  location text,
  status text not null default '收藏',
  application_date date,
  link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  amount numeric(12,2) not null,
  currency text not null default 'AUD',
  category text not null,
  spent_at date not null default current_date,
  merchant text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  summary text,
  role text,
  result text,
  link text,
  image_url text,
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  section text not null default 'task',
  title text not null,
  type text,
  start_date date,
  due_date date,
  total numeric(12,2) not null default 1,
  current numeric(12,2) not null default 0,
  unit text not null default '项',
  done boolean not null default false,
  note text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  entry_date date not null default current_date,
  mood text,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists site_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  content_key text not null unique,
  page_key text,
  selector_hint text,
  html text not null default '',
  plain_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  setting_key text not null unique,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  friend_username text,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_emoji text,
  avatar_color text,
  avatar_url text,
  message text not null check (char_length(message) between 1 and 500),
  sticker text,
  note_color text,
  delete_token text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table guestbook_messages add column if not exists delete_token text;
alter table guestbook_messages add column if not exists avatar_emoji text;
alter table guestbook_messages add column if not exists avatar_color text;
alter table guestbook_messages add column if not exists avatar_url text;

create table if not exists friend_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  username text not null unique check (username ~ '^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  password_hash text not null check (char_length(password_hash) >= 40),
  avatar_emoji text not null default '🌱',
  avatar_color text not null default '#e6f2df',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table friend_profiles add column if not exists avatar_emoji text not null default '🌱';
alter table friend_profiles add column if not exists avatar_color text not null default '#e6f2df';
alter table friend_profiles add column if not exists avatar_url text;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_set_updated_at on profile;
create trigger profile_set_updated_at before update on profile for each row execute function set_updated_at();

drop trigger if exists courses_set_updated_at on courses;
create trigger courses_set_updated_at before update on courses for each row execute function set_updated_at();

drop trigger if exists assignments_set_updated_at on assignments;
create trigger assignments_set_updated_at before update on assignments for each row execute function set_updated_at();

drop trigger if exists study_readings_set_updated_at on study_readings;
create trigger study_readings_set_updated_at before update on study_readings for each row execute function set_updated_at();

drop trigger if exists job_applications_set_updated_at on job_applications;
create trigger job_applications_set_updated_at before update on job_applications for each row execute function set_updated_at();

drop trigger if exists expenses_set_updated_at on expenses;
create trigger expenses_set_updated_at before update on expenses for each row execute function set_updated_at();

drop trigger if exists portfolio_projects_set_updated_at on portfolio_projects;
create trigger portfolio_projects_set_updated_at before update on portfolio_projects for each row execute function set_updated_at();

drop trigger if exists task_items_set_updated_at on task_items;
create trigger task_items_set_updated_at before update on task_items for each row execute function set_updated_at();

drop trigger if exists growth_entries_set_updated_at on growth_entries;
create trigger growth_entries_set_updated_at before update on growth_entries for each row execute function set_updated_at();

drop trigger if exists site_content_set_updated_at on site_content;
create trigger site_content_set_updated_at before update on site_content for each row execute function set_updated_at();

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at before update on app_settings for each row execute function set_updated_at();

drop trigger if exists guestbook_messages_set_updated_at on guestbook_messages;
create trigger guestbook_messages_set_updated_at before update on guestbook_messages for each row execute function set_updated_at();

drop trigger if exists friend_profiles_set_updated_at on friend_profiles;
create trigger friend_profiles_set_updated_at before update on friend_profiles for each row execute function set_updated_at();

alter table profile enable row level security;
alter table courses enable row level security;
alter table assignments enable row level security;
alter table study_readings enable row level security;
alter table job_applications enable row level security;
alter table expenses enable row level security;
alter table portfolio_projects enable row level security;
alter table task_items enable row level security;
alter table growth_entries enable row level security;
alter table site_content enable row level security;
alter table app_settings enable row level security;
alter table guestbook_messages enable row level security;
alter table friend_profiles enable row level security;

drop policy if exists "sage_public_read_profile" on profile;
create policy "sage_public_read_profile" on profile for select using (true);
drop policy if exists "sage_public_write_profile" on profile;
create policy "sage_public_write_profile" on profile for all using (true) with check (true);

drop policy if exists "sage_public_read_courses" on courses;
create policy "sage_public_read_courses" on courses for select using (true);
drop policy if exists "sage_public_write_courses" on courses;
create policy "sage_public_write_courses" on courses for all using (true) with check (true);

drop policy if exists "sage_public_read_assignments" on assignments;
create policy "sage_public_read_assignments" on assignments for select using (true);
drop policy if exists "sage_public_write_assignments" on assignments;
create policy "sage_public_write_assignments" on assignments for all using (true) with check (true);

drop policy if exists "sage_public_read_study_readings" on study_readings;
create policy "sage_public_read_study_readings" on study_readings for select using (true);
drop policy if exists "sage_public_write_study_readings" on study_readings;
create policy "sage_public_write_study_readings" on study_readings for all using (true) with check (true);

drop policy if exists "sage_public_read_job_applications" on job_applications;
create policy "sage_public_read_job_applications" on job_applications for select using (true);
drop policy if exists "sage_public_write_job_applications" on job_applications;
create policy "sage_public_write_job_applications" on job_applications for all using (true) with check (true);

drop policy if exists "sage_public_read_expenses" on expenses;
create policy "sage_public_read_expenses" on expenses for select using (true);
drop policy if exists "sage_public_write_expenses" on expenses;
create policy "sage_public_write_expenses" on expenses for all using (true) with check (true);

drop policy if exists "sage_public_read_portfolio_projects" on portfolio_projects;
create policy "sage_public_read_portfolio_projects" on portfolio_projects for select using (true);
drop policy if exists "sage_public_write_portfolio_projects" on portfolio_projects;
create policy "sage_public_write_portfolio_projects" on portfolio_projects for all using (true) with check (true);

drop policy if exists "sage_public_read_task_items" on task_items;
create policy "sage_public_read_task_items" on task_items for select using (true);
drop policy if exists "sage_public_write_task_items" on task_items;
create policy "sage_public_write_task_items" on task_items for all using (true) with check (true);

drop policy if exists "sage_public_read_growth_entries" on growth_entries;
create policy "sage_public_read_growth_entries" on growth_entries for select using (true);
drop policy if exists "sage_public_write_growth_entries" on growth_entries;
create policy "sage_public_write_growth_entries" on growth_entries for all using (true) with check (true);

drop policy if exists "sage_public_read_site_content" on site_content;
create policy "sage_public_read_site_content" on site_content for select using (true);
drop policy if exists "sage_public_write_site_content" on site_content;
create policy "sage_public_write_site_content" on site_content for all using (true) with check (true);

drop policy if exists "sage_public_read_app_settings" on app_settings;
create policy "sage_public_read_app_settings" on app_settings for select using (true);
drop policy if exists "sage_public_write_app_settings" on app_settings;
create policy "sage_public_write_app_settings" on app_settings for all using (true) with check (true);

drop policy if exists "sage_guestbook_read_visible" on guestbook_messages;
create policy "sage_guestbook_read_visible" on guestbook_messages for select using (is_visible = true);
drop policy if exists "sage_guestbook_insert_public" on guestbook_messages;
create policy "sage_guestbook_insert_public" on guestbook_messages for insert with check (is_visible = true);

revoke select, insert, update, delete on guestbook_messages from anon, authenticated;
grant select (id, user_id, friend_username, display_name, avatar_emoji, avatar_color, avatar_url, message, sticker, note_color, is_visible, created_at, updated_at)
on guestbook_messages to anon, authenticated;
grant insert (user_id, friend_username, display_name, avatar_emoji, avatar_color, avatar_url, message, sticker, note_color, delete_token, is_visible)
on guestbook_messages to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('friend-avatars', 'friend-avatars', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-materials', 'study-materials', false, 52428800, array['application/pdf','text/plain','application/epub+zip'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sage_friend_avatars_read" on storage.objects;
create policy "sage_friend_avatars_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'friend-avatars');

drop policy if exists "sage_friend_avatars_insert" on storage.objects;
create policy "sage_friend_avatars_insert"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'friend-avatars'
  and (storage.foldername(name))[1] ~ '^[A-Za-z0-9._-]{3,32}$'
);

drop policy if exists "sage_study_materials_read" on storage.objects;
create policy "sage_study_materials_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'study-materials');

drop policy if exists "sage_study_materials_insert" on storage.objects;
create policy "sage_study_materials_insert"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'study-materials'
  and (storage.foldername(name))[1] = 'materials'
);

drop policy if exists "sage_study_materials_update" on storage.objects;
create policy "sage_study_materials_update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'study-materials')
with check (
  bucket_id = 'study-materials'
  and (storage.foldername(name))[1] = 'materials'
);

drop policy if exists "sage_study_materials_delete" on storage.objects;
create policy "sage_study_materials_delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'study-materials');

drop policy if exists "sage_friend_profiles_read_public" on friend_profiles;
drop policy if exists "sage_friend_profiles_insert_public" on friend_profiles;

revoke select, insert, update, delete on friend_profiles from anon, authenticated;

drop function if exists sage_friend_enter(text, text, text);
drop function if exists sage_friend_enter(text, text, text, text, text);
drop function if exists sage_friend_enter(text, text, text, text, text, text);
create or replace function sage_friend_enter(
  p_display_name text,
  p_username text,
  p_password_hash text,
  p_avatar_emoji text default '🌱',
  p_avatar_color text default '#e6f2df',
  p_avatar_url text default ''
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing friend_profiles%rowtype;
  cleaned_name text := left(trim(coalesce(p_display_name, '')), 40);
  cleaned_username text := left(trim(coalesce(p_username, '')), 32);
  cleaned_hash text := trim(coalesce(p_password_hash, ''));
  cleaned_avatar text := left(trim(coalesce(p_avatar_emoji, '🌱')), 8);
  cleaned_color text := left(trim(coalesce(p_avatar_color, '#e6f2df')), 24);
  cleaned_avatar_url text := left(trim(coalesce(p_avatar_url, '')), 500);
begin
  if cleaned_name = '' then
    raise exception 'missing_display_name';
  end if;

  if cleaned_username !~ '^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$' then
    raise exception 'invalid_username';
  end if;

  if char_length(cleaned_hash) < 40 then
    raise exception 'invalid_password_hash';
  end if;

  select * into existing
  from friend_profiles fp
  where fp.username = cleaned_username;

  if found then
    if existing.password_hash <> cleaned_hash then
      raise exception 'invalid_credentials';
    end if;

    update friend_profiles
    set display_name = cleaned_name,
        avatar_emoji = coalesce(nullif(cleaned_avatar, ''), existing.avatar_emoji, '🌱'),
        avatar_color = coalesce(nullif(cleaned_color, ''), existing.avatar_color, '#e6f2df'),
        avatar_url = coalesce(nullif(cleaned_avatar_url, ''), existing.avatar_url),
        updated_at = now()
    where username = cleaned_username
    returning friend_profiles.* into existing;

    return query
    select existing.id, existing.username, existing.display_name, existing.avatar_emoji, existing.avatar_color, existing.avatar_url, existing.created_at;
    return;
  end if;

  insert into friend_profiles (username, display_name, password_hash, avatar_emoji, avatar_color, avatar_url)
  values (cleaned_username, cleaned_name, cleaned_hash, coalesce(nullif(cleaned_avatar, ''), '🌱'), coalesce(nullif(cleaned_color, ''), '#e6f2df'), nullif(cleaned_avatar_url, ''))
  returning friend_profiles.* into existing;

  return query
  select existing.id, existing.username, existing.display_name, existing.avatar_emoji, existing.avatar_color, existing.avatar_url, existing.created_at;
end;
$$;

drop function if exists sage_friend_update_avatar(text, text, text);
create function sage_friend_update_avatar(
  p_username text,
  p_password_hash text,
  p_avatar_url text
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing friend_profiles%rowtype;
  cleaned_username text := left(trim(coalesce(p_username, '')), 32);
  cleaned_hash text := trim(coalesce(p_password_hash, ''));
  cleaned_avatar_url text := left(trim(coalesce(p_avatar_url, '')), 500);
begin
  if cleaned_username !~ '^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$' then
    raise exception 'invalid_username';
  end if;

  if cleaned_avatar_url = '' then
    raise exception 'missing_avatar_url';
  end if;

  update friend_profiles fp
  set avatar_url = cleaned_avatar_url,
      updated_at = now()
  where fp.username = cleaned_username
    and fp.password_hash = cleaned_hash
  returning fp.* into existing;

  if not found then
    raise exception 'invalid_credentials';
  end if;

  return query
  select existing.id, existing.username, existing.display_name, existing.avatar_emoji, existing.avatar_color, existing.avatar_url, existing.created_at;
end;
$$;

drop function if exists sage_hide_guestbook_message(uuid, text, text);
drop function if exists sage_hide_guestbook_message(uuid, text, text, text);
create function sage_hide_guestbook_message(
  p_message_id uuid,
  p_delete_token text,
  p_username text default null,
  p_password_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hidden_count integer := 0;
  cleaned_token text := trim(coalesce(p_delete_token, ''));
  cleaned_username text := left(trim(coalesce(p_username, '')), 32);
  cleaned_hash text := trim(coalesce(p_password_hash, ''));
begin
  update guestbook_messages gm
  set is_visible = false,
      updated_at = now()
  where gm.id = p_message_id
    and gm.is_visible = true
    and (
      (gm.delete_token is not null and gm.delete_token = cleaned_token)
      or exists (
        select 1
        from friend_profiles fp
        where fp.username = cleaned_username
          and fp.password_hash = cleaned_hash
          and (
            gm.friend_username = cleaned_username
            or (gm.friend_username is null and gm.display_name = fp.display_name)
          )
      )
    );

  get diagnostics hidden_count = row_count;
  return hidden_count > 0;
end;
$$;

revoke all on function sage_friend_enter(text, text, text, text, text, text) from public;
revoke all on function sage_friend_update_avatar(text, text, text) from public;
revoke all on function sage_hide_guestbook_message(uuid, text, text, text) from public;
grant execute on function sage_friend_enter(text, text, text, text, text, text) to anon, authenticated;
grant execute on function sage_friend_update_avatar(text, text, text) to anon, authenticated;
grant execute on function sage_hide_guestbook_message(uuid, text, text, text) to anon, authenticated;
