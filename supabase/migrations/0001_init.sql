-- NoaDentLab: esquema inicial (clients, catàleg, albarans, documents pujats)

create extension if not exists pgcrypto;

create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  cat text not null default 'Varios',
  code text not null unique,
  description text not null,
  price numeric(10,2),
  price_text text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Nota: les dates (geboortedatum, inkomstdatum, uitgiftedatum) es guarden com a
-- text lliure en format dd-mm-jjjj (com a l'app original), no com a `date` de
-- Postgres, per evitar ambigüitats d'interpretació MDY/DMY en inserir-les.
create table clients (
  id uuid primary key default gen_random_uuid(),
  naam_patient text,
  geboortedatum text,
  behandelaar text,
  klant_regel2 text,
  in_opdracht text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table delivery_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  pakbonnummer text,
  inkomstdatum text,
  uitgiftedatum text,
  naam_patient text,
  geboortedatum text,
  behandelaar text,
  klant_regel2 text,
  kleur text,
  in_opdracht text,
  source text not null default 'created' check (source in ('created','uploaded','combined')),
  total numeric(10,2),
  pdf_storage_path text,
  created_at timestamptz default now()
);

create table delivery_note_lines (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references delivery_notes(id) on delete cascade,
  position int not null,
  code text,
  description text,
  qty numeric(10,2),
  price numeric(10,2),
  price_text text
);

create table uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  status text not null default 'pending' check (status in ('pending','extracted','reviewed','failed')),
  extraction_raw jsonb,
  delivery_note_id uuid references delivery_notes(id),
  uploaded_at timestamptz default now()
);

create index idx_delivery_notes_client_id on delivery_notes(client_id);
create index idx_delivery_note_lines_note_id on delivery_note_lines(delivery_note_id);
create index idx_uploaded_documents_client_id on uploaded_documents(client_id);

-- RLS: totes les taules bloquejades per a anon/authenticated.
-- L'app accedeix exclusivament amb la service-role key des del servidor (Next.js),
-- ja que l'autenticació és un login únic compartit, no un sistema multi-usuari.
alter table catalog_items enable row level security;
alter table clients enable row level security;
alter table delivery_notes enable row level security;
alter table delivery_note_lines enable row level security;
alter table uploaded_documents enable row level security;

-- Storage: bucket privat per als PDFs pujats/generats
insert into storage.buckets (id, name, public)
values ('delivery-note-pdfs', 'delivery-note-pdfs', false)
on conflict (id) do nothing;
