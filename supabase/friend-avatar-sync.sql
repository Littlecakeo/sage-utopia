alter table guestbook_messages add column if not exists avatar_emoji text;
alter table guestbook_messages add column if not exists avatar_color text;
alter table guestbook_messages add column if not exists avatar_url text;

alter table friend_profiles add column if not exists avatar_emoji text not null default '🌱';
alter table friend_profiles add column if not exists avatar_color text not null default '#e6f2df';
alter table friend_profiles add column if not exists avatar_url text;

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

drop function if exists sage_friend_enter(text, text, text);
drop function if exists sage_friend_enter(text, text, text, text, text);
drop function if exists sage_friend_enter(text, text, text, text, text, text);
create function sage_friend_enter(
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

revoke all on function sage_friend_enter(text, text, text, text, text, text) from public;
revoke all on function sage_friend_update_avatar(text, text, text) from public;
grant execute on function sage_friend_enter(text, text, text, text, text, text) to anon, authenticated;
grant execute on function sage_friend_update_avatar(text, text, text) to anon, authenticated;
