import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Memória estratégica é append-only.
 * Aprendizados novos não substituem os anteriores.
 */
export async function appendMemory(input: {
  authorId: string;
  companyId?: string;
  title: string;
  lesson: string;
  validated?: boolean;
}) {
  return prisma.strategicMemory.create({
    data: {
      authorId: input.authorId,
      companyId: input.companyId,
      title: input.title,
      lesson: input.lesson,
      validated: input.validated ?? false,
    },
  });
}

export async function listMemories(companyId?: string) {
  return prisma.strategicMemory.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
