import Link from "next/link";
import { EmptyState } from "@/components/ui/States";

export function ConnectionsPreview({ companies }: { companies: Array<{ id: string; name: string }> }) {
  return (
    <section className="surface-card p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
        Em breve
      </p>
      <h3 className="mt-1 text-[18px] font-bold">Conexões e Estratégia</h3>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Este módulo ainda não é operacional. Não há mapa persistido nem relações validadas entre empresas. A lista abaixo
        é a carteira real — sem conexões inventadas.
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
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/empresas/${company.id}`}
              className="rounded-full border px-3 py-1.5 text-[12px] font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
            >
              {company.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
