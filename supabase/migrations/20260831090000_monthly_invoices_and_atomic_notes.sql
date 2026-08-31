-- A clinic can be kept for history without being selectable for new work.
alter table clinics add column if not exists active boolean not null default true;

-- The clinic belongs to the work itself.  Looking it up through the patient
-- caused older work to move to another clinic when a patient was reassigned.
alter table delivery_notes add column if not exists clinic_id uuid references clinics(id) on delete set null;
alter table delivery_notes add column if not exists monthly_status text not null default 'pending'
  check (monthly_status in ('pending', 'reviewed', 'prepared', 'invoiced'));
create index if not exists idx_delivery_notes_clinic_id on delivery_notes(clinic_id);
create index if not exists idx_delivery_notes_monthly_status on delivery_notes(monthly_status);

update delivery_notes as note
set clinic_id = client.clinic_id
from clients as client
where note.client_id = client.id and note.clinic_id is null;

-- New patient + note + lines must succeed or fail together.  This prevents a
-- patient being created when saving the accompanying delivery note fails.
create or replace function create_patient_and_delivery_note(
  p_client_id uuid,
  p_clinic_id uuid,
  p_header jsonb,
  p_lines jsonb,
  p_total numeric,
  p_source text default 'created'
) returns uuid
language plpgsql
as $$
declare
  v_client_id uuid;
  v_note_id uuid;
begin
  if p_clinic_id is null or not exists (
    select 1 from clinics where id = p_clinic_id and active = true
  ) then
    raise exception 'Selecciona una clínica activa.';
  end if;

  if p_client_id is null then
    if nullif(trim(coalesce(p_header->>'naam_patient', '')), '') is null then
      raise exception 'Indica el nombre del paciente.';
    end if;
    insert into clients (naam_patient, geboortedatum, behandelaar, klant_regel2, in_opdracht, clinic_id)
    values (
      nullif(trim(p_header->>'naam_patient'), ''),
      nullif(trim(p_header->>'geboortedatum'), ''),
      nullif(trim(p_header->>'behandelaar'), ''),
      nullif(trim(p_header->>'klant_regel2'), ''),
      nullif(trim(p_header->>'in_opdracht'), ''),
      p_clinic_id
    )
    returning id into v_client_id;
  else
    select id into v_client_id from clients where id = p_client_id;
    if v_client_id is null then
      raise exception 'No se ha encontrado el paciente seleccionado.';
    end if;
  end if;

  insert into delivery_notes (
    client_id, clinic_id, pakbonnummer, inkomstdatum, uitgiftedatum,
    naam_patient, geboortedatum, behandelaar, klant_regel2, kleur,
    in_opdracht, source, total
  ) values (
    v_client_id, p_clinic_id,
    nullif(trim(p_header->>'pakbonnummer'), ''),
    nullif(trim(p_header->>'inkomstdatum'), ''),
    nullif(trim(p_header->>'uitgiftedatum'), ''),
    nullif(trim(p_header->>'naam_patient'), ''),
    nullif(trim(p_header->>'geboortedatum'), ''),
    nullif(trim(p_header->>'behandelaar'), ''),
    nullif(trim(p_header->>'klant_regel2'), ''),
    nullif(trim(p_header->>'kleur'), ''),
    nullif(trim(p_header->>'in_opdracht'), ''),
    p_source, p_total
  ) returning id into v_note_id;

  insert into delivery_note_lines (delivery_note_id, position, code, description, qty, price, price_text)
  select
    v_note_id, item.ordinality - 1,
    nullif(trim(item.value->>'code'), ''),
    nullif(trim(item.value->>'description'), ''),
    nullif(trim(item.value->>'qty'), '')::numeric,
    nullif(trim(item.value->>'price'), '')::numeric,
    nullif(trim(item.value->>'priceText'), '')
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as item(value, ordinality);

  return v_note_id;
end;
$$;
