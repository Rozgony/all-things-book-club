/*
  Warnings:

  - You are about to drop the column `description` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Meeting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Meeting" DROP COLUMN "description",
DROP COLUMN "title";
