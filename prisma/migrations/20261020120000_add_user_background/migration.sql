-- CreateTable
CREATE TABLE "UserBackground" (
    "userId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBackground_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserBackground" ADD CONSTRAINT "UserBackground_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

