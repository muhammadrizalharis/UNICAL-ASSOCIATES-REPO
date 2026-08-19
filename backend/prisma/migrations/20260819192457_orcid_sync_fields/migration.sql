-- AlterTable
ALTER TABLE "researcher_profiles" ADD COLUMN     "orcid_prompt_dismissed_at" TIMESTAMP(3),
ADD COLUMN     "orcid_synced_at" TIMESTAMP(3);
