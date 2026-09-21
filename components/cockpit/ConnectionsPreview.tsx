import Link from "next/link";
import { EmptyState } from "@/components/ui/States";

export function ConnectionsPreview({ companies }: { companies: Array<{ id: string; name: string }> }) {
  return (
    <section className="surface-card p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
        Inteligência
      </p>
      <h3 className="mt-1 text-[18px] font-bold">Conexões e Estratégias</h3>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        O mapa só mostra relações persistidas. Similaridade não é evidência e aprendizado de uma empresa continua hipótese na outra.
      </p>
      {companies.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nenhuma empresa na carteira"
            body="Cadastre um negócio real antes de pensar em conexões."
            action={
              <Link
                href="/empresas/nova"
                className="inline-flex rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
                style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
              >
                Cadastrar empresa
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/conexoes"
            className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            Abrir mapa
          </Link>
          <Link href="/estrategias" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
            Estratégias
          </Link>
        </div>
      )}
    </section>
  );
}
