-- CreateEnum
CREATE TYPE "EditionFormat" AS ENUM ('SOLO', 'DUPLA', 'TRIO', 'QUARTETO');

-- CreateEnum
CREATE TYPE "EditionStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchPhase" AS ENUM ('PRE_PHASE', 'ROUND_OF_16', 'QUARTERS', 'SEMIS', 'FINAL');

-- CreateEnum
CREATE TYPE "MatchResultType" AS ENUM ('TWOLALA', 'REPLICA', 'WO');

-- CreateTable
CREATE TABLE "leagues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "instagram_handle" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_rules" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "points_champion" INTEGER NOT NULL DEFAULT 10,
    "points_runner_up" INTEGER NOT NULL DEFAULT 6,
    "points_semifinalist" INTEGER NOT NULL DEFAULT 3,
    "points_quarterfinalist" INTEGER NOT NULL DEFAULT 1,
    "points_participation" INTEGER NOT NULL DEFAULT 1,
    "points_twolala_bonus" INTEGER NOT NULL DEFAULT 0,
    "points_win_per_match" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ranking_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcs" (
    "id" UUID NOT NULL,
    "vulgo" VARCHAR(50) NOT NULL,
    "real_name" VARCHAR(100),
    "instagram" VARCHAR(50),
    "home_league_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editions" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "edition_number" INTEGER NOT NULL,
    "edition_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" "EditionFormat" NOT NULL DEFAULT 'SOLO',
    "bracket_size" INTEGER NOT NULL,
    "status" "EditionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" UUID NOT NULL,
    "edition_id" UUID NOT NULL,
    "seed_number" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_members" (
    "competitor_id" UUID NOT NULL,
    "mc_id" UUID NOT NULL,

    CONSTRAINT "competitor_members_pkey" PRIMARY KEY ("competitor_id","mc_id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "edition_id" UUID NOT NULL,
    "phase" "MatchPhase" NOT NULL,
    "order_in_phase" INTEGER NOT NULL,
    "competitor_a_id" UUID,
    "competitor_b_id" UUID,
    "winner_competitor_id" UUID,
    "result_type" "MatchResultType",
    "next_match_id" UUID,
    "next_match_slot" VARCHAR(1),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_mc_stats" (
    "league_id" UUID NOT NULL,
    "mc_id" UUID NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "matches_won" INTEGER NOT NULL DEFAULT 0,
    "matches_lost" INTEGER NOT NULL DEFAULT 0,
    "twolalas_given" INTEGER NOT NULL DEFAULT 0,
    "titles_count" INTEGER NOT NULL DEFAULT 0,
    "runners_up_count" INTEGER NOT NULL DEFAULT 0,
    "editions_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_mc_stats_pkey" PRIMARY KEY ("league_id","mc_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leagues_slug_key" ON "leagues"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_rules_league_id_key" ON "ranking_rules"("league_id");

-- CreateIndex
CREATE INDEX "mcs_vulgo_idx" ON "mcs"("vulgo");

-- CreateIndex
CREATE UNIQUE INDEX "editions_league_id_edition_number_key" ON "editions"("league_id", "edition_number");

-- CreateIndex
CREATE INDEX "league_mc_stats_league_id_total_points_idx" ON "league_mc_stats"("league_id", "total_points" DESC);

-- AddForeignKey
ALTER TABLE "ranking_rules" ADD CONSTRAINT "ranking_rules_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcs" ADD CONSTRAINT "mcs_home_league_id_fkey" FOREIGN KEY ("home_league_id") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editions" ADD CONSTRAINT "editions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_members" ADD CONSTRAINT "competitor_members_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_members" ADD CONSTRAINT "competitor_members_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "mcs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competitor_a_id_fkey" FOREIGN KEY ("competitor_a_id") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competitor_b_id_fkey" FOREIGN KEY ("competitor_b_id") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_competitor_id_fkey" FOREIGN KEY ("winner_competitor_id") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_mc_stats" ADD CONSTRAINT "league_mc_stats_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_mc_stats" ADD CONSTRAINT "league_mc_stats_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "mcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
