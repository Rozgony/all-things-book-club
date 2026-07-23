-- CreateEnum
CREATE TYPE "public"."VisibilityLevel" AS ENUM ('ACCEPTING_MEMBERS', 'INVITE_ONLY', 'MEMBERS_ONLY');

-- AlterTable
ALTER TABLE "public"."Chapter" ADD COLUMN     "visibility" "public"."VisibilityLevel" NOT NULL DEFAULT 'MEMBERS_ONLY';
