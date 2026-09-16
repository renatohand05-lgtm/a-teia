import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { createCompanyAction } from "@/app/empresas/actions";

export default async function NovaEmpresaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell title="Nova empresa" subtitle="Cadastro inicial da carteira" userName={session.user.name}>
      <div className="mx-auto max-w-3xl">
        <CompanyForm action={createCompanyAction} submitLabel="Cadastrar empresa" />
      </div>
    </AppShell>
  );
}
