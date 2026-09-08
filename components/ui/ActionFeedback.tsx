"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Button } from "./Button";

export type Feedback = { type: "success" | "error"; text: string };
export function ActionFeedback({ message }: { message: Feedback | null }) {
  return <div aria-live="polite" aria-atomic="true">{message && <p role={message.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-[var(--line)] bg-[var(--tint)] text-[var(--ink)]"}`}>{message.text}</p>}</div>;
}
const FeedbackContext = createContext<(text: string, destination: string) => void>(() => {});
export const useNotice = () => useContext(FeedbackContext);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ text: string; destination: string } | null>(null);
  const pathname = usePathname();
  return <FeedbackContext.Provider value={(text, destination) => setNotice({ text, destination })}>
    {notice && pathname === notice.destination && <div className="mb-4 flex items-center gap-3"><div className="flex-1"><ActionFeedback message={{ type: "success", text: notice.text }} /></div><Button variant="secondary" onClick={() => setNotice(null)} aria-label="Cerrar confirmación">Cerrar</Button></div>}
    {children}
  </FeedbackContext.Provider>;
}
