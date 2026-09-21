-- CreateEnum
CREATE TYPE "PlaybookStatus" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'VALIDADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "PlaybookOriginKind" AS ENUM ('MEMORY', 'STRATEGY', 'EXPERIMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlaybookApplicationStatus" AS ENUM ('PROPOSTA', 'CONFIRMADA', 'REJEITADA', 'EM_TESTE', 'ARQUIVADA');

-- AlterEnum
ALTER TYPE "OpportunityOrigin" ADD VALUE 'PLAYBOOK';

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "originCompanyId" TEXT NOT NULL,
    "strategyId" TEXT,
    "opportunityId" TEXT,
    "experimentId" TEXT,
    "evidenceId" TEXT,
    "memoryId" TEXT,
    "connectionId" TEXT,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "title" TEXT NOT NULL,
    "family" TEXT,
    "description" TEXT,
    "problem" TEXT,
    "originSegment" TEXT,
    "scenario" TEXT,
    "preconditions" TEXT,
    "audience" TEXT,
    "limitations" TEXT,
    "risks" TEXT,
    "steps" JSONB,
    "durationDays" INTEGER,
    "resources" TEXT,
    "observedInvestment" DECIMAL(14,2),
    "suggestedOwner" TEXT,
    "dependencies" TEXT,
    "primaryKpi" TEXT,
    "secondaryKpis" JSONB,
    "baseline" DECIMAL(14,4),
    "target" DECIMAL(14,4),
    "observedResult" DECIMAL(14,4),
    "observedResultText" TEXT,
    "confidence" INTEGER,
    "originKind" "PlaybookOriginKind" NOT NULL DEFAULT 'MANUAL',
    "status" "PlaybookStatus" NOT NULL DEFAULT 'RASCUNHO',
    "compatibleSegments" JSONB,
    "requiredConditions" TEXT,
    "recommendedAdaptations" TEXT,
    "contrarySignals" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookApplication" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "destinationCompanyId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "status" "PlaybookApplicationStatus" NOT NULL DEFAULT 'PROPOSTA',
    "compatibilityScore" INTEGER,
    "scorePartial" BOOLEAN NOT NULL DEFAULT true,
    "scoreVersion" TEXT,
    "scoredAt" TIMESTAMP(3),
    "factorsUsed" JSONB,
    "factorsMissing" JSONB,
    "favorable" JSONB,
    "contrary" JSONB,
    "limitations" TEXT,
    "adaptedHypothesis" TEXT,
    "kpi" TEXT,
    "horizonDays" INTEGER,
    "investment" DECIMAL(14,2),
    "classification" "KnowledgeKind" NOT NULL DEFAULT 'HYPOTHESIS',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Playbook_ownerId_status_idx" ON "Playbook"("ownerId", "status");
CREATE INDEX "Playbook_originCompanyId_idx" ON "Playbook"("originCompanyId");
CREATE INDEX "Playbook_family_originSegment_idx" ON "Playbook"("family", "originSegment");
CREATE INDEX "Playbook_memoryId_idx" ON "Playbook"("memoryId");
CREATE INDEX "Playbook_strategyId_idx" ON "Playbook"("strategyId");
CREATE INDEX "Playbook_evidenceId_idx" ON "Playbook"("evidenceId");
CREATE UNIQUE INDEX "PlaybookApplication_playbookId_destinationCompanyId_key" ON "PlaybookApplication"("playbookId", "destinationCompanyId");
CREATE INDEX "PlaybookApplication_ownerId_status_idx" ON "PlaybookApplication"("ownerId", "status");
CREATE INDEX "PlaybookApplication_destinationCompanyId_idx" ON "PlaybookApplication"("destinationCompanyId");
CREATE INDEX "PlaybookApplication_opportunityId_idx" ON "PlaybookApplication"("opportunityId");

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_originCompanyId_fkey" FOREIGN KEY ("originCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "StrategicMemory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_destinationCompanyId_fkey" FOREIGN KEY ("destinationCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
