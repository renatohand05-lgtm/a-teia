-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('DRAFT', 'COMPLETE');

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "bottleneckKind" "KnowledgeKind" NOT NULL DEFAULT 'INFERENCE',
ADD COLUMN     "bottlenecks" JSONB,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "rawTotal" INTEGER,
ADD COLUMN     "scoresKind" "KnowledgeKind" NOT NULL DEFAULT 'INTERNAL_DATA';

-- AlterTable
ALTER TABLE "DiagnosisDimension" ADD COLUMN     "key" TEXT NOT NULL DEFAULT 'legacy';

-- CreateTable
CREATE TABLE "CompanyOnboarding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "updatedById" TEXT,
    "city" TEXT,
    "state" TEXT,
    "averageTicket" DECIMAL(14,2),
    "clientsPerMonth" INTEGER,
    "estimatedRecurrence" TEXT,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOnboarding_pkey" PRIMARY KEY ("id")
);

-- Existing dimensions (if any) cannot all keep the default key under the unique constraint.
UPDATE "DiagnosisDimension"
SET "key" = 'legacy_' || "id"
WHERE "key" = 'legacy';

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_idempotencyKey_key" ON "Diagnosis"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisDimension_diagnosisId_key_key" ON "DiagnosisDimension"("diagnosisId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOnboarding_companyId_key" ON "CompanyOnboarding"("companyId");

-- AddForeignKey
ALTER TABLE "CompanyOnboarding" ADD CONSTRAINT "CompanyOnboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOnboarding" ADD CONSTRAINT "CompanyOnboarding_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
