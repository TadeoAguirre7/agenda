-- CreateTable
CREATE TABLE "GymRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymDay" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "secciones" JSONB NOT NULL,
    "completadoAt" TIMESTAMP(3),

    CONSTRAINT "GymDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymRoutine_userId_key" ON "GymRoutine"("userId");

-- CreateIndex
CREATE INDEX "GymDay_routineId_idx" ON "GymDay"("routineId");

-- AddForeignKey
ALTER TABLE "GymRoutine" ADD CONSTRAINT "GymRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymDay" ADD CONSTRAINT "GymDay_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "GymRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

