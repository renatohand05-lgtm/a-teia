import { describe, expect, it } from "vitest";
import { detectQuestionIntent } from "@/lib/ai-executive-engine";
import { APPLICATION_EMPTY, buildOperationalTimeline } from "@/lib/application-center";
import { CONNECTION_EMPTY } from "@/lib/connection-engine";
import { mapScaleForCount, shouldPreferList } from "@/lib/connection-map";
import { intelligenceBreadcrumbTrail, looksLikeTechnicalId, timelineStepState } from "@/lib/intelligence-nav";
import { PLAYBOOK_EMPTY } from "@/lib/playbook-engine";
import { STRATEGY_EMPTY } from "@/lib/strategy-engine";

describe("Sprint 18 — consolidação visual e operacional", () => {
  it("breadcrumbs de inteligência não mostram ID técnico", () => {
    expect(intelligenceBreadcrumbTrail("/aplicacoes", "Aplicações")).toEqual([{ label: "Aplicações" }]);
    const detail = intelligenceBreadcrumbTrail("/aplicacoes/cmh1234567890abcdefghijk", "Aplicação", "Programa de indicação");
    expect(detail?.map((item) => item.label)).toEqual(["Aplicações", "Programa de indicação"]);
    expect(detail?.some((item) => looksLikeTechnicalId(item.label))).toBe(false);
    expect(intelligenceBreadcrumbTrail("/conexoes/cmh1234567890abcdefghijk", "Conexão", "Oficina → Burger")?.[1]?.label).toBe("Oficina → Burger");
  });

  it("timeline marca atual e bloqueia só com dependência real", () => {
    const empty = timelineStepState(buildOperationalTimeline({}));
    expect(empty[0]).toBe("current");
    expect(empty.slice(1).every((item) => item === "blocked")).toBe(true);
    const mid = buildOperationalTimeline({
      proposedAt: "2026-09-25",
      scored: true,
      reviewedAt: "2026-09-25",
    });
    expect(mid.filter((item) => item.state === "done")).toHaveLength(3);
    expect(mid.find((item) => item.state === "current")?.key).toBe("decision");
    expect(mid.find((item) => item.key === "plan")?.state).toBe("blocked");
  });

  it("empty states e mapa seguem o ciclo único", () => {
    expect(CONNECTION_EMPTY.title).toBe("Nenhuma conexão identificada.");
    expect(STRATEGY_EMPTY.title).toBe("Nenhuma estratégia criada.");
    expect(PLAYBOOK_EMPTY.title).toBe("Nenhum playbook disponível.");
    expect(APPLICATION_EMPTY.list).toMatch(/Nenhum playbook está sendo testado/);
    expect(mapScaleForCount(1).nodeRadius).toBe(22);
    expect(mapScaleForCount(5).nodeRadius).toBe(18);
    expect(mapScaleForCount(20).nodeRadius).toBe(14);
    expect(mapScaleForCount(50).nodeRadius).toBe(11);
    expect(mapScaleForCount(100).nodeRadius).toBe(8);
    expect(shouldPreferList(50)).toBe(true);
    expect(shouldPreferList(20)).toBe(false);
  });

  it("IA distingue ciclo de transferência sem inventar sucesso", () => {
    expect(detectQuestionIntent("Qual aplicação precisa de atenção?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("O que já foi replicado?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("O que ainda é hipótese?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Qual evidência existe no destino?")).toBe("PLAYBOOK");
  });
});
