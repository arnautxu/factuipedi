-- Lock the clinic against concurrent FK references before checking history.
create or replace function public.manage_clinic(target_id uuid, operation text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if operation not in ('delete', 'archive', 'restore') then raise exception 'Invalid operation'; end if;
  perform id from clinics where id = target_id for update;
  if not found then return 'not_found'; end if;
  if operation = 'delete' then
    if exists(select 1 from clients where clinic_id = target_id)
      or exists(select 1 from delivery_notes where clinic_id = target_id)
      or exists(select 1 from imported_works where clinic_id = target_id) then
      return 'has_history';
    end if;
    delete from clinics where id = target_id;
  else
    update clinics set active = (operation = 'restore'), updated_at = now() where id = target_id;
  end if;
  return 'ok';
end;
$$;
revoke all on function public.manage_clinic(uuid, text) from public, anon, authenticated;
grant execute on function public.manage_clinic(uuid, text) to service_role;
