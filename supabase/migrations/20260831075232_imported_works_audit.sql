-- External PDFs are kept as source documents. A separate imported_work can be
-- reviewed before it is converted into a final delivery note.
alter table uploaded_documents drop constraint if exists uploaded_documents_status_check;
alter table uploaded_documents add constraint uploaded_documents_status_check
  check (status in ('pending', 'extracted', 'reviewed', 'failed', 'duplicate'));

create table imported_works (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  uploaded_document_id uuid not null unique references uploaded_documents(id) on delete cascade,
  external_code text,
  patient_name text,
  document_date text,
  product_summary text,
  extracted_payload jsonb not null default '{}'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'reviewed', 'converted')),
  final_delivery_note_id uuid unique references delivery_notes(id) on delete set null,
  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_by text not null default 'system',
  updated_at timestamptz not null default now()
);

-- A provider's external code may only be imported once. Empty codes are
-- allowed because some PDFs do not provide one.
create unique index imported_works_external_code_unique
  on imported_works (lower(btrim(external_code)))
  where external_code is not null and btrim(external_code) <> '';
create index imported_works_client_id_idx on imported_works(client_id, created_at desc);
create index imported_works_document_id_idx on imported_works(uploaded_document_id);

alter table imported_works enable row level security;
