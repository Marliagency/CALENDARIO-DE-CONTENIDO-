-- AlterTable
ALTER TABLE "PublishJob" ADD COLUMN "uploadPostId" TEXT;

-- CreateIndex
CREATE INDEX "PublishJob_uploadPostId_idx" ON "PublishJob"("uploadPostId");
