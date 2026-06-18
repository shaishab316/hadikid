-- AlterTable
ALTER TABLE "carpool_invites" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carpool_members" ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carpool_round_dropoff_checklists" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carpool_round_pickup_checklists" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carpool_rounds" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carpools" ALTER COLUMN "status" DROP DEFAULT;
