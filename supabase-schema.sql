create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null check (length(category) between 1 and 80),
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  description varchar(80) not null default '',
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

grant select, insert, update, delete on public.transactions to authenticated;

alter table public.transactions enable row level security;

drop policy if exists "Users can read their transactions" on public.transactions;
create policy "Users can read their transactions"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their transactions" on public.transactions;
create policy "Users can create their transactions"
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their transactions" on public.transactions;
create policy "Users can update their transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their transactions" on public.transactions;
create policy "Users can delete their transactions"
  on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_budget numeric(12, 2) not null default 2500 check (monthly_budget > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$');

grant select, insert, update on public.user_settings to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "Users can read their settings" on public.user_settings;
create policy "Users can read their settings"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their settings" on public.user_settings;
create policy "Users can create their settings"
  on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their settings" on public.user_settings;
create policy "Users can update their settings"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from anon, authenticated;

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(931845, 1);

  if not exists (select 1 from public.app_admins) then
    insert into public.app_admins (user_id)
    select u.id
    from auth.users u
    where u.last_sign_in_at is not null
    order by u.created_at asc, u.id asc
    limit 1
    on conflict (user_id) do nothing;
  end if;

  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  )
  into caller_is_admin;

  if not caller_is_admin then
    return pg_catalog.jsonb_build_object('is_admin', false);
  end if;

  return pg_catalog.jsonb_build_object(
    'is_admin', true,
    'logged_in_users', (
      select pg_catalog.count(*)::integer
      from auth.users
      where last_sign_in_at is not null
    ),
    'login_records', (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'email', u.email,
            'last_sign_in_at', u.last_sign_in_at,
            'created_at', u.created_at
          )
          order by u.last_sign_in_at desc nulls last
        ),
        '[]'::jsonb
      )
      from auth.users u
      where u.last_sign_in_at is not null
    )
  );
end;
$$;

revoke all on function public.get_admin_dashboard_stats() from public, anon;
grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- If you need to assign a different super admin, replace the email and run:
-- insert into public.app_admins (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_ACCOUNT_EMAIL')
-- on conflict do nothing;
