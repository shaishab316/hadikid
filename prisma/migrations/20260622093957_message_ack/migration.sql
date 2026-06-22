-- AlterTable
ALTER TABLE "conversation_messages" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "seenAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT DEFAULT 'SENT';
