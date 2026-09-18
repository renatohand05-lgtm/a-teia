-- AlterTable
ALTER TABLE "FinancialRecord" ADD COLUMN "category" TEXT;
ALTER TABLE "FinancialRecord" ADD COLUMN "periodMonth" INTEGER;
ALTER TABLE "FinancialRecord" ADD COLUMN "periodYear" INTEGER;

UPDATE "FinancialRecord"
SET
  "periodMonth" = EXTRACT(MONTH FROM "occurredAt")::INTEGER,
  "periodYear" = EXTRACT(YEAR FROM "occurredAt")::INTEGER
WHERE "periodMonth" IS NULL OR "periodYear" IS NULL;

ALTER TABLE "FinancialRecord" ALTER COLUMN "periodMonth" SET NOT NULL;
ALTER TABLE "FinancialRecord" ALTER COLUMN "periodYear" SET NOT NULL;

CREATE INDEX "FinancialRecord_companyId_periodYear_periodMonth_idx"
  ON "FinancialRecord"("companyId", "periodYear", "periodMonth");

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN "realizedCost" DECIMAL(14,2);
ALTER TABLE "ActionPlan" ADD COLUMN "realizedReturn" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "FinancialStatement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "grossRevenue" DECIMAL(14,2),
    "deductions" DECIMAL(14,2),
    "cogs" DECIMAL(14,2),
    "payroll" DECIMAL(14,2),
    "rent" DECIMAL(14,2),
    "water" DECIMAL(14,2),
    "energy" DECIMAL(14,2),
    "internet" DECIMAL(14,2),
    "marketing" DECIMAL(14,2),
    "delivery" DECIMAL(14,2),
    "accounting" DECIMAL(14,2),
    "maintenance" DECIMAL(14,2),
    "otherOpex" DECIMAL(14,2),
    "salesCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialStatement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialStatement_companyId_periodYear_periodMonth_key"
  ON "FinancialStatement"("companyId", "periodYear", "periodMonth");
CREATE INDEX "FinancialStatement_companyId_periodYear_periodMonth_idx"
  ON "FinancialStatement"("companyId", "periodYear", "periodMonth");

ALTER TABLE "FinancialStatement"
  ADD CONSTRAINT "FinancialStatement_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "revenueTarget" DECIMAL(14,2),
    "ebitdaTarget" DECIMAL(14,2),
    "ebitdaPercentTarget" DECIMAL(8,2),
    "cogsPercentTarget" DECIMAL(8,2),
    "payrollPercentTarget" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialGoal_companyId_periodYear_periodMonth_key"
  ON "FinancialGoal"("companyId", "periodYear", "periodMonth");
CREATE INDEX "FinancialGoal_companyId_periodYear_periodMonth_idx"
  ON "FinancialGoal"("companyId", "periodYear", "periodMonth");

ALTER TABLE "FinancialGoal"
  ADD CONSTRAINT "FinancialGoal_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
