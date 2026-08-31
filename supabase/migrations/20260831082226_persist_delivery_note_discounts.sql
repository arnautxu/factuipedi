-- Persist both per-line and document-wide discounts so revisiting an imported
-- delivery note preserves the exact amounts that were reviewed before saving.
alter table public.delivery_notes
  add column if not exists document_discount text;

alter table public.delivery_note_lines
  add column if not exists discount text;

-- Restore discounts from already imported PDFs when the extraction is available.
update public.delivery_notes as note
set document_discount = nullif(trim(document.extraction_raw->>'discount'), '')
from public.uploaded_documents as document
where document.delivery_note_id = note.id
  and note.document_discount is null
  and nullif(trim(document.extraction_raw->>'discount'), '') is not null;

update public.delivery_note_lines as line
set discount = nullif(trim(extracted_line.value->>'discount'), '')
from public.uploaded_documents as document
cross join lateral jsonb_array_elements(coalesce(document.extraction_raw->'lines', '[]'::jsonb))
  with ordinality as extracted_line(value, ordinality)
where document.delivery_note_id = line.delivery_note_id
  and line.position = extracted_line.ordinality - 1
  and line.discount is null
  and nullif(trim(extracted_line.value->>'discount'), '') is not null;

-- Directly created delivery notes go through this atomic function too.  Keep
-- the line discount it receives in the JSON payload instead of dropping it.
create or replace function public.create_patient_and_delivery_note(
  p_client_id uuid,
  p_clinic_id uuid,
  p_header jsonb,
  p_lines jsonb,
  p_total numeric,
  p_source text default 'created'
) returns uuid
language plpgsql
set search_path = public
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
    ) returning id into v_client_id;
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

  insert into delivery_note_lines (delivery_note_id, position, code, description, qty, price, price_text, discount)
  select
    v_note_id, item.ordinality - 1,
    nullif(trim(item.value->>'code'), ''),
    nullif(trim(item.value->>'description'), ''),
    nullif(trim(item.value->>'qty'), '')::numeric,
    nullif(trim(item.value->>'price'), '')::numeric,
    nullif(trim(item.value->>'priceText'), ''),
    nullif(trim(item.value->>'discount'), '')
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as item(value, ordinality);

  return v_note_id;
end;
$$;
