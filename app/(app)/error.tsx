"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="animate-fade-slide-in flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-sm p-8 text-center">
        <h1 className="text-lg font-bold text-[var(--navy)]">S&apos;ha produït un error</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Alguna cosa ha fallat en carregar aquesta pàgina. Torna-ho a provar.
        </p>
        <Button className="mt-5" onClick={reset}>
          Reintentar
        </Button>
      </Card>
    </div>
  );
}
