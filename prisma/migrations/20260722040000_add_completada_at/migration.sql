-- Add completadaAt to track when a task was completed (for daily stats)
ALTER TABLE "Task" ADD COLUMN "completadaAt" TIMESTAMP(3);

-- Backfill existing completed tasks with their last update time so they don't reappear as pending today
UPDATE "Task" SET "completadaAt" = "updatedAt" WHERE "completada" = true AND "updatedAt" IS NOT NULL;
