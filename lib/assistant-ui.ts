import { missingData, type ExecutiveAnswer, type ExecutiveContext, type ExternalSourceCard } from "@/lib/ai-executive-engine";

export const COVERAGE_ITEMS = [
  { key: "financeiro da competência", label: "Financeiro" },
  { key: "diagnóstico 360°", label: "Diagnóstico" },
  { key: "oportunidades", label: "Oportunidades" },
  { key: "planos 30/60/90", label: "Plano 30/60/90" },
  { key: "experimentos", label: "Experimentos" },
  { key: "memória estratégica", label: "Memória" },
] as const;

export type CoverageChip = {
  label: string;
  available: boolean;
};

export function coverageFromContext(context: ExecutiveContext): CoverageChip[] {
  const missing = new Set(missingData(context));
  return COVERAGE_ITEMS.map((item) => ({
    label: item.label,
    available: !missing.has(item.key),
  }));
}

export function coveragePeriod(context: ExecutiveContext): string | null {
  return context.finance?.periodLabel ?? context.diagnosis?.createdAt?.slice(0, 10) ?? null;
}

export function assistantHref(companyId?: string | null, pergunta?: string, extra?: { nova?: boolean; conversa?: string }): string {
  const query = new URLSearchParams();
  if (pergunta) query.set("pergunta", pergunta);
  if (extra?.nova) query.set("nova", "1");
  if (extra?.conversa) query.set("conversa", extra.conversa);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return companyId ? `/empresas/${companyId}/assistente${suffix}` : `/assistente${suffix}`;
}

export const PRIMARY_ASSISTANT_SHORTCUTS = [
  { label: "Onde devo agir primeiro?", prompt: "Onde devo agir primeiro?" },
  { label: "Como está minha saúde financeira?", prompt: "Como está o financeiro?" },
  { label: "Quais são meus maiores gargalos?", prompt: "Qual é o principal gargalo desta empresa?" },
  { label: "Quais oportunidades devo analisar?", prompt: "Quais oportunidades estão priorizadas?" },
  { label: "O que está atrasado?", prompt: "O que está atrasado?" },
  { label: "Quais experimentos precisam de atenção?", prompt: "Quais experimentos precisam de atenção?" },
  { label: "O que já aprendemos nesta empresa?", prompt: "O que aprendemos?" },
  { label: "Existe aprendizado de outra empresa que pode ser aplicado aqui?", prompt: "Existe aprendizado de outra empresa que pode ser aplicado aqui?" },
  { label: "Quais empresas podem se conectar?", prompt: "Quais empresas podem se conectar?" },
  { label: "Que aprendizado posso levar para outra empresa?", prompt: "Que aprendizado posso levar para outra empresa?" },
  { label: "Onde existe oportunidade de cross-sell?", prompt: "Onde existe oportunidade de cross-sell?" },
  { label: "Que estratégia funcionou em outra empresa?", prompt: "Que estratégia funcionou em outra empresa?" },
  { label: "Quais conexões ainda são apenas hipótese?", prompt: "Quais conexões ainda são apenas hipótese?" },
  { label: "Quais conexões possuem evidência?", prompt: "Quais conexões possuem evidência?" },
  { label: "Existe algum playbook para este problema?", prompt: "Existe algum playbook para este problema?" },
  { label: "O que já funcionou em outra empresa?", prompt: "O que já funcionou em outra empresa?" },
  { label: "Que estratégia posso testar aqui?", prompt: "Que estratégia posso testar aqui?" },
  { label: "Quais playbooks possuem evidência?", prompt: "Quais playbooks possuem evidência?" },
  { label: "Quais aprendizados podem ser reutilizados?", prompt: "Quais aprendizados podem ser reutilizados?" },
  { label: "Quais playbooks estão sendo testados?", prompt: "Quais playbooks estão sendo testados?" },
  { label: "Qual aplicação precisa de decisão?", prompt: "Qual aplicação precisa de decisão?" },
  { label: "Quais testes ainda não têm resultado?", prompt: "Quais testes ainda não têm resultado?" },
  { label: "Compare meu desempenho com referências de mercado.", prompt: "Compare meu desempenho com referências de mercado." },
] as const;

export function friendlyAssistantError(message: string | null | undefined): string {
  const text = message?.trim() || "";
  if (!text) return "Não foi possível responder agora.";
  if (/stack|prisma|ECONN|ENOTFOUND|TypeError|at Object\./i.test(text)) {
    return "Não foi possível concluir a análise. Tente novamente.";
  }
  if (/timeout|demorou|ETIMEDOUT/i.test(text)) {
    return "A pesquisa demorou mais que o esperado. Tente novamente.";
  }
  if (/openai|generativ|provedor/i.test(text) && /indispon/i.test(text)) {
    return "A inteligência generativa está temporariamente indisponível. Os dados internos continuam disponíveis.";
  }
  if (/tavily|pesquisa externa/i.test(text) && /indispon/i.test(text)) {
    return "A pesquisa externa está temporariamente indisponível.";
  }
  if (/credencial não configurada/i.test(text) && /IA|openai/i.test(text)) {
    return "A inteligência generativa está temporariamente indisponível. Os dados internos continuam disponíveis.";
  }
  return text.length > 180 ? "Não foi possível concluir a análise. Tente novamente." : text;
}

export function loadingLabel(useWebSearch: boolean): string {
  return useWebSearch ? "Consultando referências externas…" : "Analisando dados da empresa…";
}

export function displaySourceType(source: { displayType?: string | null; sourceType?: string | null; confidenceLabel?: string | null }): string {
  const raw = (source.displayType || source.sourceType || source.confidenceLabel || "").toUpperCase();
  if (/OFICIAL|GOV|REGULATOR/.test(raw)) return "OFICIAL";
  if (/ESTUDO|STUDY|ACADEM/.test(raw)) return "ESTUDO";
  if (/BENCHMARK/.test(raw)) return "BENCHMARK";
  if (/ESPECIALIZ|TRADE|ASSOCI/.test(raw)) return "REFERÊNCIA ESPECIALIZADA";
  if (/SECUND|NEWS|MEDIA/.test(raw)) return "FONTE SECUNDÁRIA";
  return source.displayType || source.confidenceLabel || "REFERÊNCIA";
}

export function primaryNextActions(actions: string[]): { primary: string | null; secondary: string[] } {
  const clean = actions.map((item) => item.trim()).filter(Boolean);
  return { primary: clean[0] ?? null, secondary: clean.slice(1, 3) };
}

export function whyFromAnswer(answer: ExecutiveAnswer): string | null {
  return answer.inferences[0]?.text ?? answer.data[0]?.text ?? null;
}

export function insufficientCoverageCopy(missing: string[]): string | null {
  if (!missing.length) return null;
  if (missing.includes("diagnóstico 360°") && missing.length === 1) {
    return "Esta empresa ainda não possui Diagnóstico 360°.";
  }
  return `Não há dado suficiente para responder com segurança. Falta: ${missing.join(", ")}.`;
}

export function coverageMark(available: boolean): "✓" | "—" {
  return available ? "✓" : "—";
}

export type ConversationListItem = {
  id: string;
  title: string | null;
  companyId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function conversationDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export function primarySources(sources: ExternalSourceCard[]): ExternalSourceCard[] {
  return sources
    .filter((source) => {
      const blob = `${source.displayType ?? ""} ${source.sourceType ?? ""} ${source.claimType ?? ""} ${source.qualityLevel ?? ""}`.toUpperCase();
      return !/EXEMPLO|CALCULADORA|EXAMPLE|CALCULATOR/.test(blob);
    })
    .slice(0, 4);
}

export function divergenceCopy(answer: Pick<ExecutiveAnswer, "divergent" | "divergenceNote">): string | null {
  if (!answer.divergent) return null;
  return (
    answer.divergenceNote ??
    "As fontes encontradas apresentam referências diferentes. Não há sustentação suficiente para afirmar uma média nacional única."
  );
}

export function diagnosisCta(companyId: string | undefined, missing: string[]): { href: string; label: string } | null {
  if (!companyId || !missing.includes("diagnóstico 360°")) return null;
  return { href: `/empresas/${companyId}/diagnostico`, label: "Realizar diagnóstico" };
}

export function memoryTransferNote(text: string, companyName?: string): string | null {
  if (!/outra opera|outra empresa|origem TRANSFER|companyName/i.test(text) && companyName) {
    const mentioned = text.match(/empresa ([^·]+)/i)?.[1]?.trim();
    if (mentioned && mentioned !== "—" && mentioned !== companyName) {
      return "Aprendizado de outra operação.";
    }
  }
  if (/Aprendizado de outra operação/i.test(text)) return "Aprendizado de outra operação.";
  return null;
}

export function providerStatusCopy(ready: boolean): string {
  return ready
    ? "Inteligência generativa disponível. Fatos continuam nos dados persistidos."
    : "A inteligência generativa está temporariamente indisponível. Os dados internos continuam disponíveis.";
}

export function webStatusCopy(ready: boolean, configured?: boolean, lastFailed?: boolean): string {
  if (ready && lastFailed) {
    return "Pesquisa externa configurada. A última consulta falhou e não vira evidência interna.";
  }
  if (ready) return "Pesquisa web opcional para mercado, benchmark e referências.";
  if (configured === false) return "Pesquisa externa não configurada neste ambiente.";
  if (lastFailed) return "Pesquisa externa configurada, mas a última consulta falhou. Isso não é evidência interna.";
  return "A pesquisa externa está temporariamente indisponível.";
}

export function experimentWorkedCopy(hasMeasuredResult: boolean): string {
  return hasMeasuredResult
    ? "Há resultado medido. A leitura depende da classificação persistida."
    : "O experimento ainda não possui resultado medido.";
}

export function evidenceProvenCopy(hasValidated: boolean): string {
  return hasValidated
    ? "Somente evidências avaliadas entram como comprovadas."
    : "Não há evidências validadas. Resultado ainda não avaliado não aparece como comprovado.";
}
