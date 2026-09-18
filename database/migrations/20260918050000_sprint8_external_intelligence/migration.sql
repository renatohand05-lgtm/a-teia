-- Sprint 8: inteligência externa, pesquisa e fontes.
-- Extende AISource, ResearchSession e ResearchFinding. Não altera migrations anteriores.

ALTER TABLE "AISource" ADD COLUMN "publisher" TEXT;
ALTER TABLE "AISource" ADD COLUMN "domain" TEXT;
ALTER TABLE "AISource" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "AISource" ADD COLUMN "accessedAt" TIMESTAMP(3);
ALTER TABLE "AISource" ADD COLUMN "query" TEXT;
ALTER TABLE "AISource" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "AISource" ADD COLUMN "freshness" TEXT;
ALTER TABLE "AISource" ADD COLUMN "rank" INTEGER;

ALTER TABLE "ResearchSession" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "ResearchSession" ADD COLUMN "query" TEXT;
ALTER TABLE "ResearchSession" ADD COLUMN "cacheKey" TEXT;
ALTER TABLE "ResearchSession" ADD COLUMN "provider" TEXT;
ALTER TABLE "ResearchSession" ADD COLUMN "skippedReason" TEXT;
ALTER TABLE "ResearchSession" ADD COLUMN "sourceCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ResearchSession" ADD COLUMN "usedWeb" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ResearchFinding" ADD COLUMN "publisher" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "domain" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "ResearchFinding" ADD COLUMN "accessedAt" TIMESTAMP(3);
ALTER TABLE "ResearchFinding" ADD COLUMN "snippet" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "freshness" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "rank" INTEGER;
ALTER TABLE "ResearchFinding" ADD COLUMN "query" TEXT;

CREATE INDEX "ResearchSession_userId_createdAt_idx" ON "ResearchSession"("userId", "createdAt");
CREATE INDEX "ResearchSession_userId_cacheKey_createdAt_idx" ON "ResearchSession"("userId", "cacheKey", "createdAt");
CREATE INDEX "ResearchSession_conversationId_createdAt_idx" ON "ResearchSession"("conversationId", "createdAt");

ALTER TABLE "ResearchSession" ADD CONSTRAINT "ResearchSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
