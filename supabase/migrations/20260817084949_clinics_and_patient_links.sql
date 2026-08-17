-- Separa pacientes y clínicas. Las columnas antiguas se conservan para que
-- los albaranes históricos no pierdan la información con la que se emitieron.
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  behandelaar text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (name)
);

alter table clients add column clinic_id uuid references clinics(id) on delete set null;
create index idx_clients_clinic_id on clients(clinic_id);

-- Los registros creados desde la interfaz anterior guardaban el paciente en
-- `behandelaar`. Lo copiamos solamente cuando el campo de paciente está vacío.
update clients
set naam_patient = behandelaar
where nullif(trim(coalesce(naam_patient, '')), '') is null
  and nullif(trim(coalesce(behandelaar, '')), '') is not null;

alter table clinics enable row level security;
