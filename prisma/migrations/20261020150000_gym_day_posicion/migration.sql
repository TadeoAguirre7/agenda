-- AlterTable
ALTER TABLE "GymDay" ADD COLUMN "posicion" INTEGER NOT NULL DEFAULT 0;

-- Backfill: mismo orden que se mostraba hasta ahora (nunca hechos por
-- orden original, después los hechos del más viejo al más reciente)
UPDATE "GymDay" g
SET "posicion" = o.pos
FROM (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "routineId"
           ORDER BY ("completadoAt" IS NOT NULL), "completadoAt", "orden"
         ) - 1 AS pos
  FROM "GymDay"
) o
WHERE g."id" = o."id";
