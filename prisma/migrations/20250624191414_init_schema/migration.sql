-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('sms', 'whatsApp');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('processing', 'rejected', 'sent', 'delivered', 'viewed');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_externalId_key" ON "Notification"("externalId");

-- CreateIndex
CREATE INDEX "Notification_channel_idx" ON "Notification"("channel");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_to_idx" ON "Notification"("to");
