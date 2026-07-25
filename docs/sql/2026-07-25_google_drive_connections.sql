create table if not exists public.google_drive_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  folder_id text,
  encrypted_refresh_token text not null,
  granted_scope text not null,
  change_page_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_connections enable row level security;

-- No client policies are intentionally defined.  The service role is the only
-- runtime access path; refresh tokens must never be exposed through PostgREST.

create or replace function public.set_google_drive_connections_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists google_drive_connections_updated_at on public.google_drive_connections;
create trigger google_drive_connections_updated_at
before update on public.google_drive_connections
for each row execute function public.set_google_drive_connections_updated_at();
