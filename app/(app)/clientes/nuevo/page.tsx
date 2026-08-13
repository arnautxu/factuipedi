import ClientForm from "@/components/ClientForm";
import { createClientAction } from "../actions";

export default function NuevoClientePage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-[var(--navy)] mb-4">Nuevo cliente</h1>
      <ClientForm action={createClientAction} submitLabel="Crear cliente" />
    </div>
  );
}
