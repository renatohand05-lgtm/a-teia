-- AlterEnum
ALTER TYPE "DecisionStatus" ADD VALUE 'DEFERRED';

-- AlterTable
ALTER TABLE "Decision" ADD COLUMN "deferredAt" TIMESTAMP(3);
