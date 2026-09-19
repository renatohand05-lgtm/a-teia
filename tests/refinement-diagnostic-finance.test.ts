import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_DIMENSIONS,
  calculateScore360,
} from "@/lib/diagnostic";
import {
  bottleneckSummary,
  diagnosisCoverage,
  diagnosisDelta,
  displayDiagnosisScore,
  financeIsBottleneck,
  scaleLabel,
} from "@/lib/diagnostic-ui";
import { calculateDRE, emptyDreInput, SCENARIO_MULTIPLIERS } from "@/lib/financial-engine";
import { dreCoverage, neighborPeriod, periodLongLabel, variation } from "@/lib/financial-ui";
import { formatBRL, formatPercent } from "@/lib/format";
import { nextPeriod, parsePeriod, previousPeriod } from "@/lib/period";

function scores(map: Record<string, number> = {}) {
  return DIAGNOSTIC_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    score: map[dimension.key] ?? 3,
  }));
}

describe("Refinamento 3 — Diagnóstico 360°", () => {
  it("mantém as 10 dimensões oficiais", () => {
    expect(DIAGNOSTIC_DIMENSIONS.map((item) => item.label)).toEqual([
      "Atração",
      "Conversão",
      "Ticket Médio",
      "Recorrência",
      "Indicação",
      "Imagem da Marca",
      "Imagem Comercial",
      "Operação",
      "Financeiro",
      "Gestão & Dados",
    ]);
  });

  it("não gera nota definitiva quando o diagnóstico está incompleto", () => {
    const coverage = diagnosisCoverage([{ key: "finance", score: 2 }]);
    expect(coverage.complete).toBe(false);
    expect(coverage.label).toBe("Diagnóstico incompleto — 1 de 10 dimensões avaliadas.");
    expect(displayDiagnosisScore(40, false)).toBeNull();
    expect(() => calculateScore360([])).toThrow(/10 dimensões/);
  });

  it("preserva empate de gargalo e não escolhe em silêncio", () => {
    const result = calculateScore360(scores({ attraction: 1, conversion: 1, finance: 4 }));
    expect(result.bottlenecks).toHaveLength(2);
    expect(bottleneckSummary(result.bottlenecks).note).toContain("2 gargalos");
    expect(result.bottleneckKind).toBe("INFERENCE");
    expect(result.scoresKind).toBe("INTERNAL_DATA");
  });

  it("mostra evolução só com dois scores reais", () => {
    expect(diagnosisDelta(68, 61)?.label).toBe("+7 pontos");
    expect(diagnosisDelta(54, 57)?.label).toBe("-3 pontos");
    expect(diagnosisDelta(60, 60)?.label).toBe("estável");
    expect(diagnosisDelta(60, null)).toBeNull();
  });

  it("explica a escala 1–5 sem alterar o cálculo", () => {
    expect(scaleLabel(1)).toBe("Crítico");
    expect(scaleLabel(5)).toBe("Forte");
    expect(scaleLabel(null)).toBe("Sem dados");
    expect(financeIsBottleneck([{ key: "finance" }])).toBe(true);
  });
});

describe("Refinamento 3 — Financeiro", () => {
  it("zero persistido não é ausência e null não vira zero", () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
    expect(formatBRL(null)).toBe("—");
    const empty = calculateDRE(emptyDreInput());
    expect(empty.grossRevenue).toBeNull();
    expect(empty.ebitda).toBeNull();
    const zero = calculateDRE({ ...emptyDreInput(), grossRevenue: 0 });
    expect(zero.grossRevenue).toBe(0);
  });

  it("sinaliza DRE incompleta sem apresentar EBITDA como definitivo", () => {
    const partial = calculateDRE({ ...emptyDreInput(), grossRevenue: 100000 });
    const coverage = dreCoverage(partial);
    expect(coverage.definitive).toBe(false);
    expect(coverage.label).toContain("Dados incompletos");
  });

  it("percentual tem no máximo uma casa e cenário declara multiplicador", () => {
    expect(formatPercent(30.0000001)).toBe("30%");
    expect(SCENARIO_MULTIPLIERS.CONSERVATIVE).toBe(0.7);
    expect(SCENARIO_MULTIPLIERS.BASE).toBe(1);
    expect(SCENARIO_MULTIPLIERS.AGGRESSIVE).toBe(1.3);
  });

  it("compara períodos e não inventa competência vizinha", () => {
    const periods = [
      { periodMonth: 8, periodYear: 2026 },
      { periodMonth: 9, periodYear: 2026 },
    ];
    expect(periodLongLabel({ periodMonth: 9, periodYear: 2026 })).toBe("Setembro de 2026");
    expect(neighborPeriod(periods, { periodMonth: 9, periodYear: 2026 }, -1)).toEqual({ periodMonth: 8, periodYear: 2026 });
    expect(neighborPeriod(periods, { periodMonth: 8, periodYear: 2026 }, -1)).toBeNull();
    expect(variation(600000, 570000)?.percent).toBeCloseTo(5.3, 1);
  });

  it("parseia competência válida e navega mês a mês sem inventar DRE", () => {
    expect(parsePeriod({ mes: "9", ano: "2026" })).toEqual({ periodMonth: 9, periodYear: 2026 });
    expect(previousPeriod({ periodMonth: 1, periodYear: 2026 })).toEqual({ periodMonth: 12, periodYear: 2025 });
    expect(nextPeriod({ periodMonth: 12, periodYear: 2026 })).toEqual({ periodMonth: 1, periodYear: 2027 });
  });
});
