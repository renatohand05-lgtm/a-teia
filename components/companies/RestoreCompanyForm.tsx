"use client";

import { useState, useTransition } from "react";
import { restoreCompanyAction } from "@/app/empresas/actions";

export function RestoreCompanyForm({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
        style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
      >
        Restaurar empresa
      </button>
    );
  }

  return (
    <form
      action={(formData) => start(() => restoreCompanyAction(formData))}
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <input type="hidden" name="id" value={companyId} />
      <p className="text-[13px] font-semibold">Restaurar esta empresa?</p>
      <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
        Ela volta para a carteira ativa. O histórico de arquivamento permanece na auditoria.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          {pending ? "Restaurando..." : "Confirmar restauração"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
