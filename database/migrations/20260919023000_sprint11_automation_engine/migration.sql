-- CreateEnum
CREATE TYPE "AutomationKind" AS ENUM ('ALERTA', 'LEMBRETE', 'FOLLOW_UP', 'CHECK', 'RESUMO', 'REVISAO');

-- CreateEnum
CREATE TYPE "AutomationFrequency" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('CRITICO', 'ALTO', 'MEDIO', 'BAIXO');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AutomationFailureKind" AS ENUM ('CONFIGURATION', 'VALIDATION', 'PROVIDER', 'DATABASE', 'RATE_LIMIT', 'TIMEOUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SLACK');

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT,
    "kind" "AutomationKind" NOT NULL DEFAULT 'ALERTA',
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "AutomationFrequency" NOT NULL DEFAULT 'DAILY',
    "condition" JSONB NOT NULL,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "priority" "AlertPriority" NOT NULL DEFAULT 'MEDIO',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "automationId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'SUCCESS',
    "failureKind" "AutomationFailureKind",
    "summary" TEXT,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAlert" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "automationId" TEXT,
    "companyId" TEXT,
    "kind" "AutomationKind" NOT NULL DEFAULT 'ALERTA',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "AlertPriority" NOT NULL DEFAULT 'MEDIO',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "ruleKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "href" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "alertId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Automation_ownerId_enabled_nextRunAt_idx" ON "Automation"("ownerId", "enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "Automation_companyId_idx" ON "Automation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_idempotencyKey_key" ON "AutomationExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AutomationExecution_ownerId_startedAt_idx" ON "AutomationExecution"("ownerId", "startedAt");

-- CreateIndex
CREATE INDEX "AutomationExecution_automationId_startedAt_idx" ON "AutomationExecution"("automationId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationAlert_idempotencyKey_key" ON "AutomationAlert"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AutomationAlert_ownerId_status_detectedAt_idx" ON "AutomationAlert"("ownerId", "status", "detectedAt");

-- CreateIndex
CREATE INDEX "AutomationAlert_ownerId_ruleKey_companyId_idx" ON "AutomationAlert"("ownerId", "ruleKey", "companyId");

-- CreateIndex
CREATE INDEX "AutomationAlert_automationId_idx" ON "AutomationAlert"("automationId");

-- CreateIndex
CREATE INDEX "AppNotification_ownerId_readAt_createdAt_idx" ON "AppNotification"("ownerId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAlert" ADD CONSTRAINT "AutomationAlert_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAlert" ADD CONSTRAINT "AutomationAlert_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAlert" ADD CONSTRAINT "AutomationAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "AutomationAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
