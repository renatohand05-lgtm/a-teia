import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AssistantView } from "@/components/ai/AssistantView";
import { AppShell } from "@/components/layout/AppShell";
import { assistantHref } from "@/lib/assistant-ui";
import { isOpenAIConfigured, isWebSearchConfigured } from "@/lib/env";
import { lastWebSearchFailed } from "@/services/researchService";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function AssistentePage({
  searchParams,
}: {
  searchParams?: Promise<{ pergunta?: string; empresa?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};
  const companies = (await listCompanies(session.user.id)).filter((item) => item.status === "ACTIVE");
  const webFailed = await lastWebSearchFailed(session.user.id);

  if (params.empresa && companies.some((item) => item.id === params.empresa)) {
    redirect(assistantHref(params.empresa, params.pergunta));
  }
  if (companies.length === 1 && !params.pergunta) {
    redirect(assistantHref(companies[0]!.id));
  }

  return (
    <AppShell title="Assistente IA" subtitle="Centro de decisão empresarial" userName={session.user.name}>
      <AssistantView
        companies={companies.map((item) => ({ id: item.id, name: item.name }))}
        providerReady={isOpenAIConfigured()}
        webSearchReady={isWebSearchConfigured()}
        webSearchConfigured={isWebSearchConfigured()}
        webSearchLastFailed={webFailed}
        initialPrompt={params.pergunta}
      />
    </AppShell>
  );
}
