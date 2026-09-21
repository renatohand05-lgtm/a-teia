import { AssistantView } from "@/components/ai/AssistantView";
import { AppShell } from "@/components/layout/AppShell";
import { requireOwnedCompany } from "@/lib/access";
import { coverageFromContext, coveragePeriod } from "@/lib/assistant-ui";
import { displaySegment } from "@/lib/company-ux";
import { isOpenAIConfigured, isWebSearchConfigured } from "@/lib/env";
import { getConversation, listConversations } from "@/services/aiService";
import { getExecutiveContext } from "@/services/aiContextService";
import { lastWebSearchFailed } from "@/services/researchService";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function EmpresaAssistentePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ pergunta?: string; nova?: string; conversa?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const { userId, name, company } = await requireOwnedCompany(id);
  const [companies, conversations, context, webFailed] = await Promise.all([
    listCompanies(userId),
    listConversations(userId, id),
    getExecutiveContext(userId, id),
    lastWebSearchFailed(userId),
  ]);

  let history = null;
  if (query.nova !== "1") {
    if (query.conversa) {
      const requested = await getConversation(userId, query.conversa).catch(() => null);
      if (requested && requested.companyId === company.id) {
        history = requested;
      }
    }
    if (!history && conversations[0]) {
      history = await getConversation(userId, conversations[0].id);
    }
  }

  return (
    <AppShell title="Assistente IA" subtitle={company.name} userName={name}>
      <AssistantView
        companies={companies.filter((item) => item.status === "ACTIVE").map((item) => ({ id: item.id, name: item.name }))}
        companyId={company.id}
        companyName={company.name}
        companySegment={displaySegment(company.segment)}
        coverage={coverageFromContext(context)}
        periodLabel={coveragePeriod(context)}
        conversations={conversations}
        conversationId={history?.id}
        initialMessages={history?.messages}
        providerReady={isOpenAIConfigured()}
        webSearchReady={isWebSearchConfigured()}
        webSearchConfigured={isWebSearchConfigured()}
        webSearchLastFailed={webFailed}
        initialPrompt={query.pergunta}
      />
    </AppShell>
  );
}
