import { afterAll, afterEach, describe, expect, it } from "vitest";
import { KnowledgeKind, PrismaClient } from "@prisma/client";
import { askExecutiveAssistant } from "@/services/aiService";
import { getResearchSession, runExternalResearch } from "@/services/researchService";
import { setWebSearchProviderOverride } from "@/lib/research-providers";

const prisma = new PrismaClient();
const ids: string[] = [];

describe("pesquisa persistida, AISource e isolamento", () => {
  afterEach(() => {
    setWebSearchProviderOverride(null);
  });

  it(
    "grava fonte externa, isola owner e não pesquisa pergunta interna",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const company = await prisma.company.create({
        data: { ownerId: user.id, name: `Pesquisa Sprint 8 ${Date.now()}`, segment: "Oficina" },
      });
      ids.push(company.id);

      const internal = await askExecutiveAssistant({
        userId: user.id,
        message: "Qual meu faturamento?",
        companyId: company.id,
        useWebSearch: true,
      });
      expect(internal.answer.researchUsed).toBe(false);
      const internalSessions = await prisma.researchSession.findMany({
        where: { userId: user.id, companyId: company.id, usedWeb: true },
      });
      expect(internalSessions).toHaveLength(0);

      setWebSearchProviderOverride({
        id: "stub",
        async search() {
          return [
            {
              title: "Sebrae CMV oficinas",
              url: "https://www.sebrae.com.br/cmv-oficinas",
              snippet: "O CMV de oficinas costuma ficar em 30%.",
              publishedAt: "2026-02-01",
            },
            {
              title: "Estudo setorial",
              url: "https://www.gov.br/estudo-cmv",
              snippet: "Faixa observada de 28% a 33%.",
              publishedAt: null,
            },
          ];
        },
      });

      const previousKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const reply = await askExecutiveAssistant({
        userId: user.id,
        message: "Meu CMV está bom comparado ao mercado?",
        companyId: company.id,
      });
      if (previousKey) process.env.OPENAI_API_KEY = previousKey;

      expect(reply.answer.researchUsed).toBe(true);
      expect(reply.answer.externalSources.length).toBeGreaterThan(0);
      expect(reply.answer.evidence.every((item) => !item.text.includes("sebrae.com.br"))).toBe(true);

      const sources = await prisma.aISource.findMany({
        where: { message: { conversation: { userId: user.id, companyId: company.id } }, kind: KnowledgeKind.EXTERNAL_SOURCE },
      });
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0]?.url).toContain("https://");

      const leaked = await getResearchSession("outro-owner", reply.answer.researchSessionId ?? "cmh000000000000000000000").catch(
        (error: Error) => error,
      );
      expect(leaked).toBeInstanceOf(Error);

      const foreignCompany = await prisma.company.create({
        data: { ownerId: user.id, name: `Outra ${Date.now()}` },
      });
      ids.push(foreignCompany.id);
      await expect(runExternalResearch({ userId: "outro-owner", question: "Encontre benchmarks", companyId: company.id })).rejects.toThrow(
        /não encontrada/i,
      );
    },
    60_000,
  );

  afterAll(async () => {
    setWebSearchProviderOverride(null);
    if (ids.length) {
      await prisma.company.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }, 20_000);
});
