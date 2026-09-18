import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AssistantView } from "@/components/ai/AssistantView";
import { AppShell } from "@/components/layout/AppShell";
import { isOpenAIConfigured, isWebSearchConfigured } from "@/lib/env";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function AssistentePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const companies = (await listCompanies(session.user.id)).filter((item) => item.status === "ACTIVE");
  if (companies.length === 1) redirect(`/empresas/${companies[0]!.id}/assistente`);

  return (
    <AppShell title="Assistente IA" subtitle="Centro de decisão empresarial" userName={session.user.name}>
      <AssistantView
        companies={companies.map((item) => ({ id: item.id, name: item.name }))}
        providerReady={isOpenAIConfigured()}
        webSearchReady={isWebSearchConfigured()}
      />
    </AppShell>
  );
}
