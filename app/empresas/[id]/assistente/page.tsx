import { AssistantView } from "@/components/ai/AssistantView";
import { AppShell } from "@/components/layout/AppShell";
import { requireOwnedCompany } from "@/lib/access";
import { isOpenAIConfigured, isWebSearchConfigured } from "@/lib/env";
import { getConversation, listConversations } from "@/services/aiService";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function EmpresaAssistentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const [companies, conversations] = await Promise.all([
    listCompanies(userId),
    listConversations(userId, id),
  ]);
  const latest = conversations[0];
  const history = latest ? await getConversation(userId, latest.id) : null;

  return (
    <AppShell title="Assistente IA" subtitle={company.name} userName={name}>
      <AssistantView
        companies={companies.filter((item) => item.status === "ACTIVE").map((item) => ({ id: item.id, name: item.name }))}
        companyId={company.id}
        companyName={company.name}
        conversationId={history?.id}
        initialMessages={history?.messages}
        providerReady={isOpenAIConfigured()}
        webSearchReady={isWebSearchConfigured()}
      />
    </AppShell>
  );
}
