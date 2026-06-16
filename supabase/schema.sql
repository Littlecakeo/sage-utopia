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
  message text not null check (char_length(message) between 1 and 500),
  sticker text,
  note_color text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists friend_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  username text not null unique check (username ~ '^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  password_hash text not null check (char_length(password_hash) >= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

grant select, insert on guestbook_messages to anon, authenticated;

drop policy if exists "sage_friend_profiles_read_public" on friend_profiles;
create policy "sage_friend_profiles_read_public" on friend_profiles for select using (true);
drop policy if exists "sage_friend_profiles_insert_public" on friend_profiles;
create policy "sage_friend_profiles_insert_public" on friend_profiles for insert with check (true);

grant select, insert on friend_profiles to anon, authenticated;
