-- CreateEnum
CREATE TYPE "MemoryOrigin" AS ENUM ('OBSERVATION', 'EXPERIMENT_EVIDENCE', 'MANUAL_LESSON');

-- CreateEnum
CREATE TYPE "MemoryConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MemoryStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MemoryPolarity" AS ENUM ('POSITIVE', 'NEGATIVE', 'INCONCLUSIVE');

-- AlterTable StrategicMemory
ALTER TABLE "StrategicMemory" ADD COLUMN "origin" "MemoryOrigin" NOT NULL DEFAULT 'OBSERVATION';
ALTER TABLE "StrategicMemory" ADD COLUMN "status" "MemoryStatus" NOT NULL DEFAULT 'PROPOSED';
ALTER TABLE "StrategicMemory" ADD COLUMN "confidence" "MemoryConfidence" NOT NULL DEFAULT 'LOW';
ALTER TABLE "StrategicMemory" ADD COLUMN "polarity" "MemoryPolarity";
ALTER TABLE "StrategicMemory" ADD COLUMN "evidenceId" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "experimentId" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "opportunityId" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "strategyId" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "context" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "segment" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "kpi" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "family" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "baseline" DECIMAL(14,4);
ALTER TABLE "StrategicMemory" ADD COLUMN "target" DECIMAL(14,4);
ALTER TABLE "StrategicMemory" ADD COLUMN "measuredResult" DECIMAL(14,4);
ALTER TABLE "StrategicMemory" ADD COLUMN "classification" "ExperimentClassification";
ALTER TABLE "StrategicMemory" ADD COLUMN "limitations" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "conditions" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "investment" DECIMAL(14,2);
ALTER TABLE "StrategicMemory" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "StrategicMemory" ADD COLUMN "periodEnd" TIMESTAMP(3);
ALTER TABLE "StrategicMemory" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "StrategicMemory" ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE INDEX "StrategicMemory_companyId_status_idx" ON "StrategicMemory"("companyId", "status");
CREATE INDEX "StrategicMemory_origin_status_idx" ON "StrategicMemory"("origin", "status");
CREATE INDEX "StrategicMemory_family_kpi_idx" ON "StrategicMemory"("family", "kpi");
CREATE INDEX "StrategicMemory_evidenceId_idx" ON "StrategicMemory"("evidenceId");
CREATE INDEX "StrategicMemory_experimentId_idx" ON "StrategicMemory"("experimentId");

ALTER TABLE "StrategicMemory" ADD CONSTRAINT "StrategicMemory_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicMemory" ADD CONSTRAINT "StrategicMemory_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicMemory" ADD CONSTRAINT "StrategicMemory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicMemory" ADD CONSTRAINT "StrategicMemory_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicMemory" ADD CONSTRAINT "StrategicMemory_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
