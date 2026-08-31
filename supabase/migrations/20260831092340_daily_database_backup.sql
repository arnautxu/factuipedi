-- Application-level snapshots complement Supabase-managed platform backups.
-- They retain the data necessary to restore this app after an accidental edit
-- or deletion, while PDF originals remain in the private Storage bucket.
create extension if not exists pg_cron;

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table if not exists backup.snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payload jsonb not null,
  check (jsonb_typeof(payload) = 'object')
);

alter table backup.snapshots enable row level security;
revoke all on backup.snapshots from public, anon, authenticated;

create index if not exists snapshots_created_at_idx on backup.snapshots (created_at desc);

create or replace function backup.capture_snapshot()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, backup
as $$
declare
  snapshot_id uuid;
  snapshot_payload jsonb;
begin
  snapshot_payload := jsonb_build_object(
    'format', 'noadentlab-backup-v1',
    'created_at', now(),
    'tables', jsonb_build_object(
      'catalog_items', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.catalog_items item), '[]'::jsonb),
      'clinics', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.clinics item), '[]'::jsonb),
      'clients', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.clients item), '[]'::jsonb),
      'delivery_notes', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.delivery_notes item), '[]'::jsonb),
      'delivery_note_lines', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.delivery_note_lines item), '[]'::jsonb),
      'uploaded_documents', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.uploaded_documents item), '[]'::jsonb),
      'imported_works', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from public.imported_works item), '[]'::jsonb),
      'storage_objects', coalesce((select jsonb_agg(to_jsonb(item) order by item.id) from storage.objects item where item.bucket_id = 'delivery-note-pdfs'), '[]'::jsonb)
    )
  );

  insert into backup.snapshots (payload) values (snapshot_payload) returning id into snapshot_id;

  delete from backup.snapshots where created_at < now() - interval '35 days';
  return snapshot_id;
end;
$$;

revoke all on function backup.capture_snapshot() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'noadentlab-daily-database-snapshot';

select cron.schedule(
  'noadentlab-daily-database-snapshot',
  '17 2 * * *',
  'select backup.capture_snapshot();'
);

select backup.capture_snapshot();
