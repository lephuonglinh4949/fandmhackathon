create or replace function public.get_connected_profiles()
returns table (profile_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select users.id, lower(users.email)
  from auth.users as users
  where users.id = (select auth.uid())
    or exists (
      select 1
      from public.friend_requests as requests
      where requests.status in ('pending', 'accepted')
        and (
          (requests.sender_id = (select auth.uid()) and requests.recipient_id = users.id)
          or (requests.recipient_id = (select auth.uid()) and requests.sender_id = users.id)
        )
    );
$$;

revoke all on function public.get_connected_profiles() from public;
grant execute on function public.get_connected_profiles() to authenticated;
