import { MEMORY_CONFIDENCE_LABELS, MEMORY_STATUS_LABELS } from "@/lib/memory-engine";

export function displayMemoryStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return MEMORY_STATUS_LABELS[status as keyof typeof MEMORY_STATUS_LABELS] ?? "—";
}

export function displayMemoryConfidence(confidence: string | null | undefined): string {
  if (!confidence) return "—";
  return MEMORY_CONFIDENCE_LABELS[confidence as keyof typeof MEMORY_CONFIDENCE_LABELS] ?? "—";
}

export function memoryValidationLabel(validated: boolean, origin?: string | null): string {
  if (validated && origin === "EXPERIMENT_EVIDENCE") return "Aprendizado validado com evidência de experimento";
  if (validated) return "Aprovado — ainda exige contexto para reutilizar";
  return "Ainda não validado para recomendar";
}

export function transferabilityCopy(sameCompany: boolean): { title: string; warning: string } {
  if (sameCompany) {
    return {
      title: "Aprendizado do mesmo contexto",
      warning: "Mesmo assim, um teste anterior não garante o próximo resultado.",
    };
  }
  return {
    title: "Possível estratégia transferível.",
    warning: "Isso é hipótese até ser testada neste novo contexto. Não é previsão de sucesso.",
  };
}
