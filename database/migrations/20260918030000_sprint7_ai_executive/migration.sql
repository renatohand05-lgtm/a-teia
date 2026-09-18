-- CreateEnum
CREATE TYPE "AIActionType" AS ENUM ('CREATE_EXPERIMENT', 'CREATE_PLAN', 'CREATE_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "AIActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "AIMessage" ADD COLUMN "provider" TEXT;
ALTER TABLE "AIMessage" ADD COLUMN "model" TEXT;
ALTER TABLE "AIMessage" ADD COLUMN "structured" JSONB;

-- AlterTable
CREATE INDEX "AIConversation_companyId_createdAt_idx" ON "AIConversation"("companyId", "createdAt");

-- CreateTable
CREATE TABLE "AIActionProposal" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "AIActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AIActionStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "resultEntity" TEXT,
    "resultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIActionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIActionProposal_companyId_status_idx" ON "AIActionProposal"("companyId", "status");
CREATE INDEX "AIActionProposal_conversationId_createdAt_idx" ON "AIActionProposal"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AIActionProposal" ADD CONSTRAINT "AIActionProposal_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIActionProposal" ADD CONSTRAINT "AIActionProposal_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AIMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIActionProposal" ADD CONSTRAINT "AIActionProposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIActionProposal" ADD CONSTRAINT "AIActionProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
