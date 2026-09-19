import Link from "next/link";
import { redirect } from "next/navigation";
import { createCompanyAction } from "@/app/empresas/actions";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/auth";

export default async function NovaEmpresaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell title="Nova empresa" subtitle="Cadastro inicial da carteira" userName={session.user.name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/empresas" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Voltar às empresas
        </Link>
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          Informe o essencial agora. Financeiro, 360° e o restante entram depois, dentro da empresa.
        </p>
        <CompanyForm action={createCompanyAction} submitLabel="Cadastrar empresa" compact />
      </div>
    </AppShell>
  );
}
