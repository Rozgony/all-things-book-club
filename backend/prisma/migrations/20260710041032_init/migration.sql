-- CreateEnum
CREATE TYPE "public"."ChapterMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."MeetingStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TopicStatus" AS ENUM ('PENDING', 'SELECTED', 'DISCUSSED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Chapter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChapterMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "role" "public"."ChapterMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChapterInvitation" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Theme" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Meeting" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "status" "public"."MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "recurringGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Topic" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "wheelStatus" "public"."TopicStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TopicTheme" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "TopicTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscussionNote" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "topicId" TEXT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "Chapter_creatorId_idx" ON "public"."Chapter"("creatorId");

-- CreateIndex
CREATE INDEX "Chapter_createdAt_idx" ON "public"."Chapter"("createdAt");

-- CreateIndex
CREATE INDEX "ChapterMember_userId_idx" ON "public"."ChapterMember"("userId");

-- CreateIndex
CREATE INDEX "ChapterMember_chapterId_idx" ON "public"."ChapterMember"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterMember_userId_chapterId_key" ON "public"."ChapterMember"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "ChapterInvitation_invitedEmail_idx" ON "public"."ChapterInvitation"("invitedEmail");

-- CreateIndex
CREATE INDEX "ChapterInvitation_chapterId_idx" ON "public"."ChapterInvitation"("chapterId");

-- CreateIndex
CREATE INDEX "ChapterInvitation_expiresAt_idx" ON "public"."ChapterInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterInvitation_chapterId_invitedEmail_key" ON "public"."ChapterInvitation"("chapterId", "invitedEmail");

-- CreateIndex
CREATE INDEX "Theme_chapterId_idx" ON "public"."Theme"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_chapterId_name_key" ON "public"."Theme"("chapterId", "name");

-- CreateIndex
CREATE INDEX "Meeting_chapterId_idx" ON "public"."Meeting"("chapterId");

-- CreateIndex
CREATE INDEX "Meeting_scheduledAt_idx" ON "public"."Meeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "public"."Meeting"("status");

-- CreateIndex
CREATE INDEX "Meeting_recurringGroupId_idx" ON "public"."Meeting"("recurringGroupId");

-- CreateIndex
CREATE INDEX "Topic_meetingId_idx" ON "public"."Topic"("meetingId");

-- CreateIndex
CREATE INDEX "Topic_createdById_idx" ON "public"."Topic"("createdById");

-- CreateIndex
CREATE INDEX "Topic_createdAt_idx" ON "public"."Topic"("createdAt");

-- CreateIndex
CREATE INDEX "Topic_wheelStatus_idx" ON "public"."Topic"("wheelStatus");

-- CreateIndex
CREATE INDEX "TopicTheme_topicId_idx" ON "public"."TopicTheme"("topicId");

-- CreateIndex
CREATE INDEX "TopicTheme_themeId_idx" ON "public"."TopicTheme"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTheme_topicId_themeId_key" ON "public"."TopicTheme"("topicId", "themeId");

-- CreateIndex
CREATE INDEX "DiscussionNote_meetingId_idx" ON "public"."DiscussionNote"("meetingId");

-- CreateIndex
CREATE INDEX "DiscussionNote_topicId_idx" ON "public"."DiscussionNote"("topicId");

-- CreateIndex
CREATE INDEX "DiscussionNote_userId_idx" ON "public"."DiscussionNote"("userId");

-- AddForeignKey
ALTER TABLE "public"."Chapter" ADD CONSTRAINT "Chapter_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChapterMember" ADD CONSTRAINT "ChapterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChapterMember" ADD CONSTRAINT "ChapterMember_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChapterInvitation" ADD CONSTRAINT "ChapterInvitation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChapterInvitation" ADD CONSTRAINT "ChapterInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Theme" ADD CONSTRAINT "Theme_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicTheme" ADD CONSTRAINT "TopicTheme_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicTheme" ADD CONSTRAINT "TopicTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscussionNote" ADD CONSTRAINT "DiscussionNote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscussionNote" ADD CONSTRAINT "DiscussionNote_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscussionNote" ADD CONSTRAINT "DiscussionNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
