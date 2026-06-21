/*
  Warnings:

  - A unique constraint covering the columns `[conversationId]` on the table `carpools` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "carpool_rounds" ADD COLUMN     "driverId" INTEGER;

-- AlterTable
ALTER TABLE "carpools" ADD COLUMN     "conversationId" TEXT;

-- CreateIndex
CREATE INDEX "carpool_rounds_driverId_idx" ON "carpool_rounds"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "carpools_conversationId_key" ON "carpools"("conversationId");

-- AddForeignKey
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_rounds" ADD CONSTRAINT "carpool_rounds_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
