import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client amb service-role key: només s'invoca des de Route Handlers / Server Actions.
// Mai s'importa des de codi que pugui acabar en un bundle de client.
//
// No es parametritza amb el tipus Database perquè el generic estricte de
// supabase-js exigeix Row/Insert/Update/Relationships complets; en lloc
// d'això, els tipus de types/database.ts es fan servir manualment a
// lib/supabase/queries.ts sobre els resultats de cada consulta.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Falten NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
