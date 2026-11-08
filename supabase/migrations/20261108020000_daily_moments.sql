create table if not exists public.daily_moment_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  photo_day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_day)
);
alter table public.daily_moment_claims enable row level security;
revoke all on public.daily_moment_claims from public, anon, authenticated;

insert into public.daily_moment_claims (user_id, photo_day)
select user_id, (created_at at time zone 'UTC')::date
from public.moments
group by user_id, (created_at at time zone 'UTC')::date
on conflict (user_id, photo_day) do nothing;

create or replace function public.create_daily_moment(
  photo_storage_path text,
  photo_caption text,
  photo_location text,
  photo_latitude double precision,
  photo_longitude double precision
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  signed_in_user_id uuid;
  v_photo_day date;
  new_moment_id uuid;
begin
  select id
    into signed_in_user_id
    from public.profiles
    where id = (select auth.uid())
    for update;

  if signed_in_user_id is null then
    raise exception 'You must be signed in to share a photo.';
  end if;

  if photo_storage_path is null
    or split_part(photo_storage_path, '/', 1) <> signed_in_user_id::text then
    raise exception 'The photo must belong to your account.';
  end if;

  if photo_location is null or length(btrim(photo_location)) = 0 then
    raise exception 'Choose a location for your photo.';
  end if;

  v_photo_day := (now() at time zone 'UTC')::date;

  insert into public.daily_moment_claims (user_id, photo_day)
  values (signed_in_user_id, v_photo_day)
  on conflict (user_id, photo_day) do nothing;

  if not found then
    raise exception 'You already shared a photo today. You can post again after midnight UTC.';
  end if;

  insert into public.moments (
    user_id,
    storage_path,
    caption,
    location,
    latitude,
    longitude
  )
  values (
    signed_in_user_id,
    photo_storage_path,
    coalesce(photo_caption, ''),
    photo_location,
    photo_latitude,
    photo_longitude
  )
  returning id into new_moment_id;

  return new_moment_id;
end;
$$;

revoke all on function public.create_daily_moment(
  text, text, text, double precision, double precision
) from public;
grant execute on function public.create_daily_moment(
  text, text, text, double precision, double precision
) to authenticated;

revoke insert on public.moments from public, anon, authenticated;

drop policy if exists "Users can view their own and friends moments" on public.moments;
create policy "Users can view their own and friends moments"
  on public.moments for select to authenticated
  using (
    created_at >= (
      date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
    )
    and created_at < (
      (date_trunc('day', now() at time zone 'UTC') + interval '1 day')
      at time zone 'UTC'
    )
    and (
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
    )
  );

drop policy if exists "Users can view their own and friends moment photos" on storage.objects;
create policy "Users can view their own and friends moment photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'moments'
    and exists (
      select 1
      from public.moments as moment
      where moment.storage_path = objects.name
        and moment.created_at >= (
          date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
        )
        and moment.created_at < (
          (date_trunc('day', now() at time zone 'UTC') + interval '1 day')
          at time zone 'UTC'
        )
        and (
          moment.user_id = (select auth.uid())
          or exists (
            select 1
            from public.friend_requests as requests
            where requests.status = 'accepted'
              and (
                (requests.sender_id = (select auth.uid()) and requests.recipient_id = moment.user_id)
                or (requests.recipient_id = (select auth.uid()) and requests.sender_id = moment.user_id)
              )
          )
        )
    )
  );
