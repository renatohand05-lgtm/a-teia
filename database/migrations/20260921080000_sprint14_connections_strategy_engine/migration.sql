-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('SUGERIDA', 'EM_ANALISE', 'APROVADA', 'EM_TESTE', 'VALIDADA', 'REJEITADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "ConnectionClassification" AS ENUM ('DADO_INTERNO', 'INFERENCIA', 'HIPOTESE', 'EVIDENCIA', 'MEMORIA_VALIDADA', 'FONTE_EXTERNA', 'RECOMENDACAO');

-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('RASCUNHO', 'PROPOSTA', 'APROVADA', 'EM_TESTE', 'VALIDADA', 'REJEITADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "StrategyEffort" AS ENUM ('BAIXO', 'MEDIO', 'ALTO', 'INDETERMINADO');

-- CreateEnum
CREATE TYPE "StrategyRisk" AS ENUM ('BAIXO', 'MODERADO', 'ALTO', 'INDETERMINADO');

-- AlterEnum
ALTER TYPE "OpportunityOrigin" ADD VALUE 'STRATEGY';

-- AlterTable Connection
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "status" "ConnectionStatus" NOT NULL DEFAULT 'SUGERIDA';
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "classification" "ConnectionClassification" NOT NULL DEFAULT 'HIPOTESE';
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "mechanism" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "hypothesis" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "justification" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "limitations" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "scorePartial" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "scoreReasons" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "scoreFactorsUsed" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "scoreFactorsMissing" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "scoreVersion" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "scoredAt" TIMESTAMP(3);
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "potential" DECIMAL(14,2);
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "usedCompanyFields" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "usedMemoryIds" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "usedEvidenceIds" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "usedExternalSourceIds" JSONB;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "discoveryKey" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "Connection" AS c
SET "ownerId" = co."ownerId"
FROM "Company" AS co
WHERE c."fromId" = co."id" AND c."ownerId" IS NULL;

DELETE FROM "Connection" WHERE "ownerId" IS NULL;

ALTER TABLE "Connection" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable Strategy
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "destinationCompanyId" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "connectionId" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "opportunityId" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "mechanism" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "problem" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "hypothesis" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "audience" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "valueProposition" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "primaryKpi" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "secondaryKpi" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "estimatedInvestment" DECIMAL(14,2);
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "effort" "StrategyEffort" NOT NULL DEFAULT 'INDETERMINADO';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "testHorizonDays" INTEGER;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "risk" "StrategyRisk" NOT NULL DEFAULT 'INDETERMINADO';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "recommendationOrigin" "ConnectionClassification" NOT NULL DEFAULT 'HIPOTESE';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "internalSources" JSONB;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "externalSources" JSONB;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "evidenceIds" JSONB;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "memoryIds" JSONB;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);

UPDATE "Strategy" AS s
SET "ownerId" = co."ownerId"
FROM "Company" AS co
WHERE s."companyId" = co."id" AND s."ownerId" IS NULL;

DELETE FROM "Strategy" WHERE "ownerId" IS NULL;

ALTER TABLE "Strategy" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Strategy" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "Strategy" SET "status" = 'RASCUNHO' WHERE "status" IS NULL OR "status" IN ('draft', 'DRAFT', '');
ALTER TABLE "Strategy" ALTER COLUMN "status" TYPE "StrategyStatus" USING (
  CASE
    WHEN "status" IN ('RASCUNHO','PROPOSTA','APROVADA','EM_TESTE','VALIDADA','REJEITADA','ARQUIVADA') THEN "status"::"StrategyStatus"
    ELSE 'RASCUNHO'::"StrategyStatus"
  END
);
ALTER TABLE "Strategy" ALTER COLUMN "status" SET DEFAULT 'RASCUNHO';

-- Foreign keys and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Connection_discoveryKey_key" ON "Connection"("discoveryKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Connection_ownerId_fromId_toId_type_key" ON "Connection"("ownerId", "fromId", "toId", "type");
CREATE INDEX IF NOT EXISTS "Connection_ownerId_status_idx" ON "Connection"("ownerId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "Strategy_opportunityId_key" ON "Strategy"("opportunityId");
CREATE INDEX IF NOT EXISTS "Strategy_ownerId_status_idx" ON "Strategy"("ownerId", "status");
CREATE INDEX IF NOT EXISTS "Strategy_destinationCompanyId_idx" ON "Strategy"("destinationCompanyId");
CREATE INDEX IF NOT EXISTS "Strategy_connectionId_idx" ON "Strategy"("connectionId");

ALTER TABLE "Connection" ADD CONSTRAINT "Connection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_destinationCompanyId_fkey" FOREIGN KEY ("destinationCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
