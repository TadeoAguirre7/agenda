-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "diasSemana" TEXT,
ADD COLUMN     "hora" TEXT,
ADD COLUMN     "intervaloDias" INTEGER,
ADD COLUMN     "recurrencia" TEXT NOT NULL DEFAULT 'ninguna',
ADD COLUMN     "ultimaHechaDia" TEXT;
