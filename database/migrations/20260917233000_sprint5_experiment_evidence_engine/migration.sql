-- CreateEnum
CREATE TYPE "ExperimentDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- CreateEnum
CREATE TYPE "ExperimentClassification" AS ENUM ('VALIDATED', 'PARTIALLY_VALIDATED', 'INCONCLUSIVE', 'REFUTED');

-- AlterEnum
ALTER TYPE "ExperimentStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ExperimentStatus" ADD VALUE 'READY';
ALTER TYPE "ExperimentStatus" ADD VALUE 'CANCELLED';

-- AlterTable Experiment
ALTER TABLE "Experiment" ADD COLUMN "actionPlanId" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "strategyId" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "kpiUnit" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "direction" "ExperimentDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER';
ALTER TABLE "Experiment" ADD COLUMN "baseline" DECIMAL(14,4);
ALTER TABLE "Experiment" ADD COLUMN "target" DECIMAL(14,4);
ALTER TABLE "Experiment" ADD COLUMN "testDescription" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "successCriteria" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "notes" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "realizedInvestment" DECIMAL(14,2);
ALTER TABLE "Experiment" ADD COLUMN "realizedReturn" DECIMAL(14,2);
ALTER TABLE "Experiment" ADD COLUMN "classification" "ExperimentClassification";
ALTER TABLE "Experiment" ADD COLUMN "classificationReason" TEXT;
ALTER TABLE "Experiment" ADD COLUMN "finalValue" DECIMAL(14,4);
ALTER TABLE "Experiment" ADD COLUMN "plannedEndAt" TIMESTAMP(3);

CREATE INDEX "Experiment_companyId_status_idx" ON "Experiment"("companyId", "status");
CREATE INDEX "Experiment_opportunityId_idx" ON "Experiment"("opportunityId");
CREATE INDEX "Experiment_actionPlanId_idx" ON "Experiment"("actionPlanId");

ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable ExperimentResult
ALTER TABLE "ExperimentResult" ADD COLUMN "recordedById" TEXT;
ALTER TABLE "ExperimentResult" ADD CONSTRAINT "ExperimentResult_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Evidence
ALTER TABLE "Evidence" ADD COLUMN "experimentId" TEXT;
ALTER TABLE "Evidence" ADD COLUMN "opportunityId" TEXT;
ALTER TABLE "Evidence" ADD COLUMN "classification" "ExperimentClassification";
CREATE INDEX "Evidence_experimentId_idx" ON "Evidence"("experimentId");
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
