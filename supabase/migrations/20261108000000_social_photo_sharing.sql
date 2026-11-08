create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_not_self check (sender_id <> recipient_id)
);

create unique index if not exists friend_requests_active_pair_idx
  on public.friend_requests (
    least(sender_id, recipient_id),
    greatest(sender_id, recipient_id)
  )
  where status in ('pending', 'accepted');

create index if not exists friend_requests_sender_created_idx
  on public.friend_requests (sender_id, created_at desc);

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  caption text not null default '',
  location text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  constraint moments_location_not_blank check (length(btrim(location)) > 0)
);

create index if not exists moments_user_created_idx
  on public.moments (user_id, created_at desc);

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists sync_profile_after_auth_insert on auth.users;
create trigger sync_profile_after_auth_insert
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth_user();

drop trigger if exists sync_profile_after_auth_email_update on auth.users;
create trigger sync_profile_after_auth_email_update
  after update of email on auth.users
  for each row execute function public.sync_profile_from_auth_user();

insert into public.profiles (id, email)
select id, lower(email)
from auth.users
where email is not null
on conflict (id) do update set email = excluded.email;

create or replace function public.request_friend_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  new_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a friend request.';
  end if;

  if target_email is null or length(btrim(target_email)) = 0 then
    raise exception 'Enter the email address of the person you want to add.';
  end if;

  if (
    select count(*)
    from public.friend_requests
    where sender_id = auth.uid()
      and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many requests. Please try again later.';
  end if;

  select users.id
    into target_user_id
    from auth.users as users
    where lower(users.email) = lower(btrim(target_email))
    limit 1;

  if target_user_id is null or target_user_id = auth.uid() then
    raise exception 'No matching account was found for that email.';
  end if;

  if exists (
    select 1
    from public.friend_requests as requests
    where requests.status in ('pending', 'accepted')
      and least(requests.sender_id, requests.recipient_id)
        = least(auth.uid(), target_user_id)
      and greatest(requests.sender_id, requests.recipient_id)
        = greatest(auth.uid(), target_user_id)
  ) then
    raise exception 'A request or friendship already exists for that account.';
  end if;

  insert into public.friend_requests (sender_id, recipient_id)
  values (auth.uid(), target_user_id)
  returning id into new_request_id;

  return new_request_id;
end;
$$;

create or replace function public.respond_to_friend_request(
  request_id uuid,
  accept_request boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to respond to friend requests.';
  end if;

  update public.friend_requests
    set status = case when accept_request then 'accepted' else 'declined' end,
        updated_at = now()
    where id = request_id
      and recipient_id = auth.uid()
      and status = 'pending';

  if not found then
    raise exception 'This friend request is no longer available.';
  end if;
end;
$$;

revoke all on function public.request_friend_by_email(text) from public;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public;
grant execute on function public.request_friend_by_email(text) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.moments enable row level security;

grant select on public.profiles, public.friend_requests to authenticated;
grant select, insert, delete on public.moments to authenticated;

drop policy if exists "Users can view their connected profiles" on public.profiles;
create policy "Users can view their connected profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.friend_requests as requests
      where requests.status in ('pending', 'accepted')
        and (
          (requests.sender_id = (select auth.uid()) and requests.recipient_id = id)
          or (requests.recipient_id = (select auth.uid()) and requests.sender_id = id)
        )
    )
  );

drop policy if exists "Users can view their own friend requests" on public.friend_requests;
create policy "Users can view their own friend requests"
  on public.friend_requests for select to authenticated
  using (
    sender_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

drop policy if exists "Users can view their own and friends moments" on public.moments;
create policy "Users can view their own and friends moments"
  on public.moments for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.friend_requests as requests
      where requests.status = 'accepted'
        and (
          (requests.sender_id = (select auth.uid()) and requests.recipient_id = user_id)
          or (requests.recipient_id = (select auth.uid()) and requests.sender_id = user_id)
        )
    )
  );

drop policy if exists "Users can add their own moments" on public.moments;
create policy "Users can add their own moments"
  on public.moments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and storage_path like ((select auth.uid())::text || '/%')
  );

drop policy if exists "Users can delete their own moments" on public.moments;
create policy "Users can delete their own moments"
  on public.moments for delete to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moments',
  'moments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own moment photos" on storage.objects;
create policy "Users can upload their own moment photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'moments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can view their own and friends moment photos" on storage.objects;
create policy "Users can view their own and friends moment photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'moments'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.friend_requests as requests
        where requests.status = 'accepted'
          and (
            (
              requests.sender_id = (select auth.uid())
              and requests.recipient_id::text = (storage.foldername(name))[1]
            )
            or (
              requests.recipient_id = (select auth.uid())
              and requests.sender_id::text = (storage.foldername(name))[1]
            )
          )
      )
    )
  );

drop policy if exists "Users can delete their own moment photos" on storage.objects;
create policy "Users can delete their own moment photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'moments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'friend_requests'
    ) then
      alter publication supabase_realtime add table public.friend_requests;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'moments'
    ) then
      alter publication supabase_realtime add table public.moments;
    end if;
  end if;
end;
$$;
