-- AlterEnum
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'REVISADA';
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_APROVACAO';
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'APROVADA';
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'PLANEJADA';
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'MEDIDA';
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'CONCLUIDA';
ALTER TYPE "PlaybookApplicationStatus" ADD VALUE IF NOT EXISTS 'CANCELADA';

-- AlterTable
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "decisionId" TEXT;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "actionPlanId" TEXT;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "experimentId" TEXT;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "resultingEvidenceId" TEXT;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "resultingMemoryId" TEXT;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "adaptations" JSONB;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "differences" JSONB;
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "proposedTarget" DECIMAL(14,4);
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "PlaybookApplication" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlaybookApplication_decisionId_idx" ON "PlaybookApplication"("decisionId");
CREATE INDEX IF NOT EXISTS "PlaybookApplication_actionPlanId_idx" ON "PlaybookApplication"("actionPlanId");
CREATE INDEX IF NOT EXISTS "PlaybookApplication_experimentId_idx" ON "PlaybookApplication"("experimentId");

-- AddForeignKey
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_resultingEvidenceId_fkey" FOREIGN KEY ("resultingEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlaybookApplication" ADD CONSTRAINT "PlaybookApplication_resultingMemoryId_fkey" FOREIGN KEY ("resultingMemoryId") REFERENCES "StrategicMemory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
