import { describe, expect, it } from "vitest";
import {
  evaluateExperimentResult,
  nextOpportunityEvidenceLevel,
} from "@/lib/experiment-engine";
import {
  compareTargetVsResult,
  currentExperimentStage,
  displayExperimentStatus,
  displayRecordCount,
  evidenceStrength,
  experimentNextAction,
  financialImpactLabel,
  formatExperimentNumber,
} from "@/lib/experiment-ui";
import { memoryValidationLabel, transferabilityCopy } from "@/lib/memory-ui";
import { canAccessCompany } from "@/lib/access-policy";
import { aiMayExecute } from "@/lib/security/critical-actions";
import { isAllowedProposedAction } from "@/lib/ai-executive-engine";
import { experimentInputSchema, experimentResultSchema } from "@/lib/validations";

describe("Refinamento 5 — Experimento e resultado", () => {
  it("mapeia status do schema sem inventar enum", () => {
    expect(displayExperimentStatus("DRAFT")).toBe("Rascunho");
    expect(displayExperimentStatus("PLANNED")).toBe("Planejado");
    expect(displayExperimentStatus("READY")).toBe("Planejado");
    expect(displayExperimentStatus("RUNNING")).toBe("Em andamento");
    expect(displayExperimentStatus("COMPLETED")).toBe("Concluído");
    expect(displayExperimentStatus("CANCELLED")).toBe("Cancelado");
  });

  it("não classifica experimento sem resultado", () => {
    const running = evaluateExperimentResult({
      baseline: 10,
      target: 20,
      finalValue: null,
      direction: "HIGHER_IS_BETTER",
      measurementCount: 0,
      status: "RUNNING",
    });
    expect(running.sufficient).toBe(false);
    expect(running.classification).toBe("INCONCLUSIVE");
    expect(currentExperimentStage({ status: "RUNNING", hasMeasurements: false, hasFinalResult: false, hasEvidence: false })).toBe(
      "Em andamento",
    );
    expect(experimentNextAction({
      status: "RUNNING",
      hasFinalResult: false,
      hasEvidence: false,
      hasMemory: false,
      companyId: "emp",
      experimentId: "exp",
    }).label).toBe("Registrar resultado");
  });

  it("compara meta e resultado sem chamar sucesso automático", () => {
    const up = compareTargetVsResult({ target: 20, result: 24, direction: "HIGHER_IS_BETTER", unit: "%" });
    expect(up.metaLabel).toContain("20");
    expect(up.resultLabel).toContain("24");
    expect(up.differenceLabel).toBe("+4 p.p.");
    expect(up.situation).not.toMatch(/sucesso/i);
    const down = compareTargetVsResult({ target: 20, result: 14, direction: "HIGHER_IS_BETTER", unit: "%" });
    expect(down.differenceLabel).toBe("-6 p.p.");
    expect(compareTargetVsResult({ target: null, result: 10, direction: "HIGHER_IS_BETTER" }).comparable).toBe(false);
  });

  it("ausência de dado não vira zero", () => {
    expect(formatExperimentNumber(null)).toBe("Não informado");
    expect(formatExperimentNumber(0)).toBe("0");
    expect(displayRecordCount(false, 0)).toBe("Sem dados");
    expect(displayRecordCount(true, 0)).toBe("0");
    expect(financialImpactLabel(null)).toBe("Impacto financeiro não medido.");
  });

  it("valida criação sem preencher resultado", () => {
    const parsed = experimentInputSchema.safeParse({
      companyId: "clxxxxxxxxxxxxxxxxxxxx",
      title: "Contato preventivo",
      hypothesis: "Contato preventivo com clientes aumenta retorno à oficina.",
      kpi: "Retenção",
      direction: "HIGHER_IS_BETTER",
      target: 20,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("finalValue" in parsed.data).toBe(false);
    }
    expect(experimentResultSchema.safeParse({
      companyId: "clxxxxxxxxxxxxxxxxxxxx",
      experimentId: "clyyyyyyyyyyyyyyyyyyyy",
      finalValue: 24,
    }).success).toBe(true);
  });
});

describe("Refinamento 5 — Evidência e memória", () => {
  it("resultado concluído não vira evidência validada da oportunidade sozinho se a leitura for inconclusiva", () => {
    expect(nextOpportunityEvidenceLevel([])).toBe("HYPOTHESIS");
    expect(nextOpportunityEvidenceLevel(["INCONCLUSIVE"])).toBe("TESTING");
    expect(nextOpportunityEvidenceLevel(["VALIDATED"])).toBe("VALIDATED_EVIDENCE");
  });

  it("força da evidência fica limitada sem dados essenciais", () => {
    const limited = evidenceStrength({ kpi: null, target: null, result: null, endedAt: null, measurementCount: 0 });
    expect(limited.limited).toBe(true);
    expect(limited.label).toBe("Evidência limitada.");
    const ready = evidenceStrength({
      kpi: "Retenção",
      target: 20,
      result: 24,
      endedAt: "2026-09-19",
      measurementCount: 2,
    });
    expect(ready.limited).toBe(false);
  });

  it("memória validada exige sustentação e transferência continua hipótese", () => {
    expect(memoryValidationLabel(false)).toBe("Ainda não validado para recomendar");
    expect(memoryValidationLabel(true, "EXPERIMENT_EVIDENCE")).toMatch(/evidência/);
    expect(transferabilityCopy(false).title).toBe("Possível estratégia transferível.");
    expect(transferabilityCopy(false).warning).toMatch(/hipótese/i);
  });

  it("IA não valida evidência, não conclui experimento e não promove memória", () => {
    expect(aiMayExecute("evidence.validate")).toBe(false);
    expect(aiMayExecute("experiment.complete")).toBe(false);
    expect(aiMayExecute("memory.promote")).toBe(false);
    expect(isAllowedProposedAction("CREATE_EXPERIMENT")).toBe(true);
    expect(isAllowedProposedAction("VALIDATE_EVIDENCE")).toBe(false);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
  });
});
