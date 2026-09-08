"use client";
import { useEffect, useRef } from "react";

// Leave native Back navigation alone; links and closing/reloading are guarded.
export function useUnsavedChanges(dirty: boolean) {
  const allow = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allow.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (allow.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.href === location.href || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Salir y descartarlos?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [dirty]);
  return () => { allow.current = true; };
}
