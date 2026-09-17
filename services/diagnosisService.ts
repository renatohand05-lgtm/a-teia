import "server-only";

import { KnowledgeKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import {
  DIAGNOSTIC_DIMENSIONS,
  bottleneckLabels,
  calculateScore360,
  type DiagnosticDimensionKey,
} from "@/lib/diagnostic";
import type { DiagnosisInput } from "@/lib/validations";

export type DiagnosisDTO = {
  id: string;
  companyId: string;
  createdById: string | null;
  createdAt: string;
  rawTotal: number;
  overallScore: number;
  maturity: string;
  bottleneck: string;
  bottlenecks: Array<{ key: string; label: string; score: number }>;
  strengths: Array<{ key: string; label: string; score: number }>;
  attention: Array<{ key: string; label: string; score: number }>;
  scoresKind: KnowledgeKind;
  bottleneckKind: KnowledgeKind;
  dimensions: Array<{ key: string; name: string; score: number }>;
};

function asBottlenecks(value: Prisma.JsonValue | null): Array<{ key: string; label: string; score: number }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Array<{
    key: string;
    label: string;
    score: number;
  }>;
}

export function toDiagnosisDTO(row: {
  id: string;
  companyId: string;
  createdById: string | null;
  createdAt: Date;
  rawTotal: number | null;
  overallScore: number | null;
  maturity: string | null;
  bottleneck: string | null;
  bottlenecks: Prisma.JsonValue | null;
  scoresKind: KnowledgeKind;
  bottleneckKind: KnowledgeKind;
  dimensions: Array<{ key: string; name: string; score: number }>;
}): DiagnosisDTO {
  const dimensions = row.dimensions
    .slice()
    .sort(
      (a, b) =>
        DIAGNOSTIC_DIMENSIONS.findIndex((d) => d.key === a.key) -
        DIAGNOSTIC_DIMENSIONS.findIndex((d) => d.key === b.key),
    );
  const computed =
    dimensions.length === DIAGNOSTIC_DIMENSIONS.length
      ? calculateScore360(
          dimensions.map((item) => ({
            key: item.key as DiagnosticDimensionKey,
            score: item.score,
          })),
        )
      : null;

  return {
    id: row.id,
    companyId: row.companyId,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    rawTotal: row.rawTotal ?? computed?.rawTotal ?? 0,
    overallScore: row.overallScore ?? computed?.score100 ?? 0,
    maturity: row.maturity ?? computed?.maturity ?? "—",
    bottleneck: row.bottleneck ?? (computed ? bottleneckLabels(computed) : "—"),
    bottlenecks: computed?.bottlenecks ?? asBottlenecks(row.bottlenecks),
    strengths: computed?.strengths ?? [],
    attention: computed?.attention ?? [],
    scoresKind: row.scoresKind,
    bottleneckKind: row.bottleneckKind,
    dimensions,
  };
}

export async function listDiagnoses(ownerId: string, companyId: string): Promise<DiagnosisDTO[]> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return [];
  const rows = await prisma.diagnosis.findMany({
    where: { companyId, isDemo: false },
    include: { dimensions: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDiagnosisDTO);
}

export async function getLatestDiagnosis(ownerId: string, companyId: string): Promise<DiagnosisDTO | null> {
  const list = await listDiagnoses(ownerId, companyId);
  return list[0] ?? null;
}

export async function getDiagnosis(
  ownerId: string,
  companyId: string,
  diagnosisId: string,
): Promise<DiagnosisDTO | null> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return null;
  const row = await prisma.diagnosis.findFirst({
    where: { id: diagnosisId, companyId },
    include: { dimensions: true },
  });
  return row ? toDiagnosisDTO(row) : null;
}

export async function createDiagnosis(
  ownerId: string,
  companyId: string,
  input: DiagnosisInput,
): Promise<DiagnosisDTO> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) {
    throw new Error("Empresa não encontrada.");
  }

  const existing = await prisma.diagnosis.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { dimensions: true },
  });
  if (existing) {
    if (existing.companyId !== companyId) {
      throw new Error("Envio duplicado inválido.");
    }
    return toDiagnosisDTO(existing);
  }

  const scores = DIAGNOSTIC_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    score: input.scores[dimension.key],
  }));
  const result = calculateScore360(scores);

  try {
    const row = await prisma.diagnosis.create({
      data: {
        companyId,
        createdById: ownerId,
        title: `Diagnóstico 360° — ${company.name}`,
        summary: `Score ${result.score100}/100 · ${result.maturity}. Gargalo: ${bottleneckLabels(result)}.`,
        rawTotal: result.rawTotal,
        overallScore: result.score100,
        bottleneck: bottleneckLabels(result),
        bottlenecks: result.bottlenecks,
        maturity: result.maturity,
        scoresKind: KnowledgeKind.INTERNAL_DATA,
        bottleneckKind: KnowledgeKind.INFERENCE,
        idempotencyKey: input.idempotencyKey,
        isDemo: false,
        dimensions: {
          create: DIAGNOSTIC_DIMENSIONS.map((dimension) => ({
            key: dimension.key,
            name: dimension.label,
            score: input.scores[dimension.key],
          })),
        },
      },
      include: { dimensions: true },
    });

    await writeAudit({
      actorId: ownerId,
      action: "diagnosis.create",
      entity: "Diagnosis",
      entityId: row.id,
      newValue: {
        companyId,
        overallScore: row.overallScore,
        maturity: row.maturity,
        bottleneck: row.bottleneck,
      },
      origin: "USER",
    });

    return toDiagnosisDTO(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.diagnosis.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { dimensions: true },
      });
      if (raced && raced.companyId === companyId) return toDiagnosisDTO(raced);
    }
    throw error;
  }
}
