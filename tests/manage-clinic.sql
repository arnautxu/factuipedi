-- Run against the configured Supabase project. All fixture changes roll back.
begin;
do $$
declare c uuid; p uuid; n uuid; outcome text;
begin
  insert into clinics(name, active) values ('__UX_TRANSACTION_' || gen_random_uuid(), true) returning id into c;
  outcome := manage_clinic(c, 'archive');
  if outcome <> 'ok' or (select active from clinics where id = c) then raise exception 'archive failed'; end if;
  outcome := manage_clinic(c, 'restore');
  if outcome <> 'ok' or not (select active from clinics where id = c) then raise exception 'restore failed'; end if;
  insert into clients(naam_patient, clinic_id) values ('__UX_TEST', c) returning id into p;
  outcome := manage_clinic(c, 'delete');
  if outcome <> 'has_history' then raise exception 'patient history guard failed'; end if;
  delete from clients where id = p;
  insert into delivery_notes(clinic_id, source) values (c, 'created') returning id into n;
  outcome := manage_clinic(c, 'delete');
  if outcome <> 'has_history' then raise exception 'note history guard failed'; end if;
  delete from delivery_notes where id = n;
  outcome := manage_clinic(c, 'delete');
  if outcome <> 'ok' or exists(select 1 from clinics where id = c) then raise exception 'delete empty failed'; end if;
  if has_function_privilege('anon', 'public.manage_clinic(uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.manage_clinic(uuid,text)', 'execute') then
    raise exception 'public permissions failed';
  end if;
end $$;
rollback;
