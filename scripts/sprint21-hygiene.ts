import { AuditSource, DecisionStatus, PrismaClient } from "@prisma/client";
import { isAlimentacaoTypo, persistableSegment } from "../lib/company-ux";
import { isUnequivocalTestOrphanDecision, TEST_ORPHAN_DECISION_TITLES } from "../lib/decision-reason";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { isDemo: false },
    select: { id: true, name: true, segment: true, status: true, ownerId: true },
  });

  const unlinkableWhere = {
    companyId: null,
    opportunityId: null,
    strategyId: null,
    allocationProposals: { none: {} },
    playbookApplications: { none: {} },
  };

  const [companyIdNull, unlinkable, pendingUnlinkable, titles] = await Promise.all([
    prisma.decision.count({ where: { companyId: null } }),
    prisma.decision.count({ where: unlinkableWhere }),
    prisma.decision.count({
      where: {
        ...unlinkableWhere,
        status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
      },
    }),
    prisma.decision.groupBy({
      by: ["title", "status"],
      where: unlinkableWhere,
      _count: true,
    }),
  ]);

  const typos = companies.filter((item) => isAlimentacaoTypo(item.segment));
  const segmentFixes: Array<{ id: string; name: string; from: string | null; to: string }> = [];
  for (const company of typos) {
    const next = persistableSegment(company.segment);
    if (!next || next === company.segment) continue;
    await prisma.company.update({ where: { id: company.id }, data: { segment: next } });
    await prisma.auditLog.create({
      data: {
        actorId: company.ownerId,
        companyId: company.id,
        action: "company.segment.typo_corrected",
        entity: "Company",
        entityId: company.id,
        category: "company",
        success: true,
        previousValue: { segment: company.segment },
        newValue: { segment: next, reason: "ALIMENTAÇÃP → Alimentação" },
        origin: AuditSource.SYSTEM,
      },
    });
    segmentFixes.push({ id: company.id, name: company.name, from: company.segment, to: next });
  }

  const pendingOrphans = await prisma.decision.findMany({
    where: {
      ...unlinkableWhere,
      title: { in: [...TEST_ORPHAN_DECISION_TITLES] },
      status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
    },
    select: { id: true, title: true, status: true, companyId: true, opportunityId: true },
  });
  const eligible = pendingOrphans.filter((item) =>
    isUnequivocalTestOrphanDecision({
      title: item.title,
      companyId: item.companyId,
      opportunityId: item.opportunityId,
      hasAllocationProposal: false,
      status: item.status,
    }),
  );
  const ids = eligible.map((item) => item.id);
  if (ids.length) {
    await prisma.decision.updateMany({
      where: { id: { in: ids } },
      data: {
        status: DecisionStatus.CANCELLED,
        humanReason:
          "Resíduo de teste: empresa apagada (companyId SetNull). Cancelada no Sprint 21. Histórico APPROVED/EXECUTED preservado.",
      },
    });
    const actorId = companies[0]?.ownerId ?? null;
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? undefined,
        action: "decision.test_orphan.cancelled",
        entity: "Decision",
        category: "decision",
        success: true,
        newValue: {
          count: ids.length,
          titles: [...TEST_ORPHAN_DECISION_TITLES],
          ids: ids.slice(0, 80),
          preserved: "APPROVED/EXECUTED/REJECTED not cancelled",
        },
        origin: AuditSource.SYSTEM,
      },
    });
  }

  const after = await prisma.decision.groupBy({
    by: ["title", "status"],
    where: unlinkableWhere,
    _count: true,
  });

  console.log(
    JSON.stringify(
      {
        companies: companies.map((item) => ({
          id: item.id,
          name: item.name,
          segment: item.segment,
          status: item.status,
        })),
        before: {
          companyIdNull,
          unlinkable,
          pendingUnlinkable,
          titles: titles.sort((a, b) => b._count - a._count),
        },
        segmentFixes,
        cancelledPendingTestOrphans: ids.length,
        afterTitles: after.sort((a, b) => b._count - a._count),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
