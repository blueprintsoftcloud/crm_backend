-- Migration: add_feature_flags
-- Adds:
--   1. Feature enum (7 features that Super Admin can toggle)
--   2. FeatureFlag table (stores enabled/disabled state per feature)

CREATE TYPE "Feature" AS ENUM (
  'USER_MANAGEMENT',
  'CATEGORY_MANAGEMENT',
  'PRODUCT_MANAGEMENT',
  'ORDER_MANAGEMENT',
  'COUPON_MANAGEMENT',
  'NOTIFICATION_MANAGEMENT',
  'REPORTS_ANALYTICS'
);

CREATE TABLE "FeatureFlag" (
  "id"        TEXT NOT NULL,
  "feature"   "Feature" NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlag_feature_key" ON "FeatureFlag"("feature");
