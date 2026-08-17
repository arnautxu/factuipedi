import ClientForm from "@/components/ClientForm";
import { createClientAction } from "../actions";
import { getClinics } from "@/lib/supabase/queries";

export default async function NuevoClientePage() {
  const clinics = await getClinics();
  return (
    <div>
      <h1 className="text-lg font-bold text-[var(--navy)] mb-4">Nuevo paciente</h1>
      <ClientForm clinics={clinics} action={createClientAction} submitLabel="Crear paciente" />
    </div>
  );
}
