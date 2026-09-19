"use client";

import { useState, useTransition } from "react";
import { archiveCompanyAction } from "@/app/empresas/actions";

export function ArchiveCompanyForm({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border px-3 py-2 text-[12px] font-bold"
        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
      >
        Arquivar empresa
      </button>
    );
  }

  return (
    <form
      action={(formData) => start(() => archiveCompanyAction(formData))}
      className="rounded-xl border p-3"
      style={{ borderColor: "rgba(224,86,76,.35)" }}
    >
      <input type="hidden" name="id" value={companyId} />
      <p className="text-[13px] font-semibold">Arquivar esta empresa?</p>
      <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
        Ela sai da carteira ativa. Os dados permanecem. Isto não exclui a empresa.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border px-3 py-2 text-[12px] font-bold disabled:opacity-50"
          style={{ borderColor: "rgba(224,86,76,.45)", color: "#f09a93" }}
        >
          {pending ? "Arquivando..." : "Confirmar arquivamento"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
