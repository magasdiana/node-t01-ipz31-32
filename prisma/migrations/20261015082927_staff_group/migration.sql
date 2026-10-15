-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "group_id" INTEGER;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
