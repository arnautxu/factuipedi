import ClinicForm from "@/components/ClinicForm";
import { createClinicAction } from "../actions";

export default function NuevaClinicaPage() {
  return <div><h1 className="mb-4 text-lg font-bold text-[var(--navy)]">Nueva clínica</h1><ClinicForm action={createClinicAction} submitLabel="Crear clínica" /></div>;
}
