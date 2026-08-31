-- Keep the function's name resolution deterministic without elevating its
-- permissions. The function remains SECURITY INVOKER (the PostgreSQL default).
alter function public.create_patient_and_delivery_note(uuid, uuid, jsonb, jsonb, numeric, text)
  set search_path = public;
