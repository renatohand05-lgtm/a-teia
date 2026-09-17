-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'VALIDATED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('HYPOTHESIS', 'TESTING', 'PARTIAL_EVIDENCE', 'VALIDATED_EVIDENCE');

-- CreateEnum
CREATE TYPE "OpportunityOrigin" AS ENUM ('SUGGESTED', 'MANUAL');

-- AlterTable
ALTER TABLE "Opportunity"
ADD COLUMN     "confidence" INTEGER,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "diagnosisId" TEXT,
ADD COLUMN     "effort" INTEGER,
ADD COLUMN     "estimatedHours" DECIMAL(10,2),
ADD COLUMN     "evidenceLevel" "EvidenceLevel" NOT NULL DEFAULT 'HYPOTHESIS',
ADD COLUMN     "expectedImpact" INTEGER,
ADD COLUMN     "hypothesis" TEXT,
ADD COLUMN     "origin" "OpportunityOrigin" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "paybackMonths" DECIMAL(8,2),
ADD COLUMN     "problemStatement" TEXT,
ADD COLUMN     "queuedForPlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scorePartial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scoreReasons" JSONB,
ADD COLUMN     "sourceDimension" TEXT,
ADD COLUMN     "templateKey" TEXT,
ADD COLUMN     "urgency" INTEGER;

-- Convert legacy string status ("open") to enum.
ALTER TABLE "Opportunity" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "Opportunity" SET "status" = 'DRAFT' WHERE "status" IS NULL OR "status" NOT IN ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'VALIDATED', 'REJECTED', 'ARCHIVED');
ALTER TABLE "Opportunity" ALTER COLUMN "status" TYPE "OpportunityStatus" USING "status"::"OpportunityStatus";
ALTER TABLE "Opportunity" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Opportunity_companyId_score_idx" ON "Opportunity"("companyId", "score");

-- CreateIndex
CREATE INDEX "Opportunity_diagnosisId_idx" ON "Opportunity"("diagnosisId");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
