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
