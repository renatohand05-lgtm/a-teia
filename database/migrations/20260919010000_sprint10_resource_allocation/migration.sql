-- CreateEnum
CREATE TYPE "AllocationScenarioKind" AS ENUM ('CONSERVADOR', 'BALANCEADO', 'EXPANSAO');

-- CreateEnum
CREATE TYPE "AllocationHorizon" AS ENUM ('DAYS_30', 'DAYS_60', 'DAYS_90', 'MONTHS_6', 'MONTHS_12');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('SIMULATION', 'PROPOSAL', 'SENT_TO_DECISION', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AllocationEligibility" AS ENUM ('ELEGIVEL', 'ELEGIVEL_COM_RESSALVAS', 'DADOS_INSUFICIENTES', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "AllocationSourceKind" AS ENUM ('OPPORTUNITY', 'PLAN', 'EXPERIMENT', 'DECISION', 'PRIORITY');

-- CreateEnum
CREATE TYPE "AllocationEvidenceClass" AS ENUM ('SEM_EVIDENCIA', 'HIPOTESE', 'SINAL_INICIAL', 'EVIDENCIA_VALIDADA');

-- CreateEnum
CREATE TYPE "AllocationRiskLevel" AS ENUM ('BAIXO', 'MODERADO', 'ALTO', 'INDETERMINADO');

-- CreateEnum
CREATE TYPE "AllocationReadiness" AS ENUM ('PRONTO', 'PARCIAL', 'INSUFICIENTE');

-- CreateTable
CREATE TABLE "ResourceBudget" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "capitalAvailable" DECIMAL(14,2),
    "hoursAvailable" DECIMAL(10,2),
    "capacityLimit" INTEGER,
    "reserveMinimum" DECIMAL(14,2),
    "maxPerCompany" DECIMAL(14,2),
    "maxPerInitiative" DECIMAL(14,2),
    "maxPercentPerInitiative" DECIMAL(8,2),
    "horizon" "AllocationHorizon" NOT NULL DEFAULT 'DAYS_90',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationProposal" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'SIMULATION',
    "scenario" "AllocationScenarioKind" NOT NULL DEFAULT 'BALANCEADO',
    "horizon" "AllocationHorizon" NOT NULL DEFAULT 'DAYS_90',
    "capitalAvailable" DECIMAL(14,2),
    "hoursAvailable" DECIMAL(10,2),
    "capacityLimit" INTEGER,
    "reserveMinimum" DECIMAL(14,2),
    "maxPerCompany" DECIMAL(14,2),
    "maxPerInitiative" DECIMAL(14,2),
    "maxPercentPerInitiative" DECIMAL(8,2),
    "capitalAllocated" DECIMAL(14,2),
    "capitalPreserved" DECIMAL(14,2),
    "hoursAllocated" DECIMAL(10,2),
    "hoursPreserved" DECIMAL(10,2),
    "snapshot" JSONB NOT NULL,
    "decisionId" TEXT,
    "actionPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "companyId" TEXT,
    "sourceKind" "AllocationSourceKind" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "allocated" BOOLEAN NOT NULL DEFAULT false,
    "skipReason" TEXT,
    "eligibility" "AllocationEligibility" NOT NULL,
    "readiness" "AllocationReadiness" NOT NULL,
    "risk" "AllocationRiskLevel" NOT NULL,
    "evidenceClass" "AllocationEvidenceClass" NOT NULL,
    "capital" DECIMAL(14,2),
    "hours" DECIMAL(10,2),
    "expectedReturn" DECIMAL(14,2),
    "paybackMonths" DECIMAL(8,2),
    "estimatedRoiBps" INTEGER,
    "rationale" TEXT,
    "explanation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceBudget_ownerId_key" ON "ResourceBudget"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationProposal_ownerId_version_key" ON "AllocationProposal"("ownerId", "version");

-- CreateIndex
CREATE INDEX "AllocationProposal_ownerId_status_createdAt_idx" ON "AllocationProposal"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AllocationItem_proposalId_allocated_idx" ON "AllocationItem"("proposalId", "allocated");

-- CreateIndex
CREATE INDEX "AllocationItem_companyId_idx" ON "AllocationItem"("companyId");

-- AddForeignKey
ALTER TABLE "ResourceBudget" ADD CONSTRAINT "ResourceBudget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationProposal" ADD CONSTRAINT "AllocationProposal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationProposal" ADD CONSTRAINT "AllocationProposal_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationItem" ADD CONSTRAINT "AllocationItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "AllocationProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationItem" ADD CONSTRAINT "AllocationItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
