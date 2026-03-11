import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/database";
import { Feature } from "../src/generated/prisma/client";

// All available feature flags — default all to enabled
const ALL_FEATURES: Feature[] = [
  "USER_MANAGEMENT",
  "CATEGORY_MANAGEMENT",
  "PRODUCT_MANAGEMENT",
  "ORDER_MANAGEMENT",
  "COUPON_MANAGEMENT",
  "NOTIFICATION_MANAGEMENT",
  "REPORTS_ANALYTICS",
  "CUSTOMER_ACTIVITY_TRACKER",
];

async function main() {
  // ── 1. Upsert Super Admin ──────────────────────────────────────────────────
  const email = "pingwgc@gmail.com";
  const plainPassword = "Admin@1234";
  const hash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", isVerified: true },
    create: {
      username: "Super Admin",
      email,
      phone: "0000000000",
      password: hash,
      role: "SUPER_ADMIN",
      isVerified: true,
    },
  });
  console.log("✅ Super admin upserted:", user.id, user.email, user.role);

  // ── 2. Seed FeatureFlags (all enabled by default) ─────────────────────────
  for (const feature of ALL_FEATURES) {
    await prisma.featureFlag.upsert({
      where: { feature },
      update: {},          // Don't overwrite if it already exists (preserves admin's choices)
      create: { feature, isEnabled: true },
    });
  }
  console.log("✅ Feature flags seeded:", ALL_FEATURES.join(", "));
}

main().finally(() => prisma.$disconnect());
