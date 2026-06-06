/*
  Warnings:

  - You are about to drop the column `lastCheckedAt` on the `tracked_symbols` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tracked_symbols" DROP COLUMN "lastCheckedAt";
