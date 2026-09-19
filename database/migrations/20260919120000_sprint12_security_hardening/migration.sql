-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "companyId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "category" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");
CREATE INDEX "AuditLog_success_createdAt_idx" ON "AuditLog"("success", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
