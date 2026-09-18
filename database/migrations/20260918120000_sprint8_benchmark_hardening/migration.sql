-- Sprint 8 hardening: claim type, quality and audit fields. Incremental. Does not reset data.

ALTER TABLE "AISource" ADD COLUMN "claimType" TEXT;
ALTER TABLE "AISource" ADD COLUMN "qualityLevel" TEXT;
ALTER TABLE "AISource" ADD COLUMN "relevanceReason" TEXT;
ALTER TABLE "AISource" ADD COLUMN "rejectedReason" TEXT;
ALTER TABLE "AISource" ADD COLUMN "benchmarkEligible" BOOLEAN;
ALTER TABLE "AISource" ADD COLUMN "suspectedOutlier" BOOLEAN;

ALTER TABLE "ResearchFinding" ADD COLUMN "claimType" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "qualityLevel" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "relevanceReason" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "rejectedReason" TEXT;
ALTER TABLE "ResearchFinding" ADD COLUMN "benchmarkEligible" BOOLEAN;
ALTER TABLE "ResearchFinding" ADD COLUMN "suspectedOutlier" BOOLEAN;
