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

revoke all on function sage_hide_guestbook_message(uuid, text, text, text) from public;
grant execute on function sage_hide_guestbook_message(uuid, text, text, text) to anon, authenticated;
