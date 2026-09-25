"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ApplicationSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  function commit(next: string) {
    const query = new URLSearchParams(params.toString());
    if (next.trim()) query.set("q", next.trim());
    else query.delete("q");
    query.delete("pagina");
    const suffix = query.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname);
  }

  return (
    <label className="min-w-[200px] flex-1 text-[12px]">
      <span className="sr-only">Buscar aplicações</span>
      <input
        type="search"
        value={value}
        placeholder="Playbook, empresa ou KPI"
        aria-label="Buscar por playbook, empresa origem, destino ou KPI"
        className="w-full rounded-lg border bg-transparent px-3 py-2"
        style={{ borderColor: "var(--border)" }}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(next), 400);
        }}
      />
    </label>
  );
}
