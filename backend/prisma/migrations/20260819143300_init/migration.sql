-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GUEST', 'MEMBER', 'MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('JOURNAL_ARTICLE', 'PROCEEDING', 'BOOK_CHAPTER', 'BOOK', 'PREPRINT');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScopusQuartile" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4', 'NONE');

-- CreateEnum
CREATE TYPE "SintaLevel" AS ENUM ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'NONE');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "unical_id" VARCHAR(15) NOT NULL,
    "full_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "bio" TEXT,
    "faculty" TEXT,
    "department" TEXT,
    "expertise" JSONB NOT NULL DEFAULT '[]',
    "orcid" TEXT,
    "scopus_id" TEXT,
    "sinta_id" TEXT,
    "scholar_id" TEXT,
    "h_index" INTEGER NOT NULL DEFAULT 0,
    "i10_index" INTEGER NOT NULL DEFAULT 0,
    "total_citations" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "researcher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "issn" VARCHAR(9),
    "eissn" VARCHAR(9),
    "country" TEXT,
    "website" TEXT,
    "scopus_quartile" "ScopusQuartile" NOT NULL DEFAULT 'NONE',
    "sinta_level" "SintaLevel" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "doi" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "type" "PublicationType" NOT NULL DEFAULT 'JOURNAL_ARTICLE',
    "journal_id" UUID,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "published_date" DATE,
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "url" TEXT,
    "pdf_url" TEXT,
    "citation_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_by" UUID NOT NULL,
    "metadata_raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_authors" (
    "id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "researcher_id" UUID,
    "raw_author_name" TEXT NOT NULL,
    "author_order" SMALLINT NOT NULL,
    "is_corresponding" BOOLEAN NOT NULL DEFAULT false,
    "affiliation_raw" TEXT,

    CONSTRAINT "publication_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_publication" (
    "publication_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "category_publication_pkey" PRIMARY KEY ("publication_id","category_id")
);

-- CreateTable
CREATE TABLE "indexations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "badge_color" TEXT,

    CONSTRAINT "indexations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_indexations" (
    "publication_id" UUID NOT NULL,
    "indexation_id" UUID NOT NULL,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "publication_indexations_pkey" PRIMARY KEY ("publication_id","indexation_id")
);

-- CreateTable
CREATE TABLE "citation_snapshots" (
    "id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "citation_count" INTEGER NOT NULL,
    "snapshot_date" DATE NOT NULL,

    CONSTRAINT "citation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_requests" (
    "id" UUID NOT NULL,
    "publication_author_id" UUID NOT NULL,
    "researcher_id" UUID NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_profiles_user_id_key" ON "researcher_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_profiles_unical_id_key" ON "researcher_profiles"("unical_id");

-- CreateIndex
CREATE INDEX "researcher_profiles_full_name_idx" ON "researcher_profiles"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "journals_issn_key" ON "journals"("issn");

-- CreateIndex
CREATE INDEX "journals_name_idx" ON "journals"("name");

-- CreateIndex
CREATE UNIQUE INDEX "publications_doi_key" ON "publications"("doi");

-- CreateIndex
CREATE INDEX "publications_status_published_date_idx" ON "publications"("status", "published_date" DESC);

-- CreateIndex
CREATE INDEX "publications_citation_count_idx" ON "publications"("citation_count" DESC);

-- CreateIndex
CREATE INDEX "publication_authors_researcher_id_idx" ON "publication_authors"("researcher_id");

-- CreateIndex
CREATE UNIQUE INDEX "publication_authors_publication_id_author_order_key" ON "publication_authors"("publication_id", "author_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "category_publication_category_id_publication_id_idx" ON "category_publication"("category_id", "publication_id");

-- CreateIndex
CREATE UNIQUE INDEX "indexations_code_key" ON "indexations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "citation_snapshots_publication_id_snapshot_date_key" ON "citation_snapshots"("publication_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "claim_requests_status_idx" ON "claim_requests"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_authors" ADD CONSTRAINT "publication_authors_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_authors" ADD CONSTRAINT "publication_authors_researcher_id_fkey" FOREIGN KEY ("researcher_id") REFERENCES "researcher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_publication" ADD CONSTRAINT "category_publication_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_publication" ADD CONSTRAINT "category_publication_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_indexations" ADD CONSTRAINT "publication_indexations_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_indexations" ADD CONSTRAINT "publication_indexations_indexation_id_fkey" FOREIGN KEY ("indexation_id") REFERENCES "indexations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_indexations" ADD CONSTRAINT "publication_indexations_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_snapshots" ADD CONSTRAINT "citation_snapshots_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_publication_author_id_fkey" FOREIGN KEY ("publication_author_id") REFERENCES "publication_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_researcher_id_fkey" FOREIGN KEY ("researcher_id") REFERENCES "researcher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
