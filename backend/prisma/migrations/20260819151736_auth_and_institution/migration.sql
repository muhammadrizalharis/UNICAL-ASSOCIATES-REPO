/*
  Warnings:

  - You are about to drop the column `department` on the `researcher_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `faculty` on the `researcher_profiles` table. All the data in the column will be lost.
  - Added the required column `first_name` to the `researcher_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "researcher_profiles" DROP COLUMN "department",
DROP COLUMN "faculty",
ADD COLUMN     "affiliation_completed_at" TIMESTAMP(3),
ADD COLUMN     "country" VARCHAR(2),
ADD COLUMN     "department_id" UUID,
ADD COLUMN     "department_other" TEXT,
ADD COLUMN     "faculty_id" UUID,
ADD COLUMN     "faculty_other" TEXT,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "institution" TEXT DEFAULT 'Universitas Muhammadiyah Makassar',
ADD COLUMN     "last_name" TEXT,
ALTER COLUMN "unical_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "faculties" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "degree" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faculties_code_key" ON "faculties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_name_key" ON "faculties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_slug_key" ON "departments"("slug");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_faculty_id_name_degree_key" ON "departments"("faculty_id", "name", "degree");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
