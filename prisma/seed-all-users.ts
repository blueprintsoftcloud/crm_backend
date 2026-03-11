// prisma/seed-all-users.ts
// Seeds all test accounts: SUPER_ADMIN, ADMIN, and 2 CUSTOMER accounts.
// Idempotent — uses upsert, safe to run multiple times.
// Password for ALL accounts: Admin@1234

import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/database";
import { Feature } from "../src/generated/prisma/client";

const COMMON_PASSWORD = "Admin@1234";
const SALT_ROUNDS = 12;

const ALL_FEATURES: Feature[] = [
  "USER_MANAGEMENT",
  "CATEGORY_MANAGEMENT",
  "PRODUCT_MANAGEMENT",
  "ORDER_MANAGEMENT",
  "COUPON_MANAGEMENT",
  "NOTIFICATION_MANAGEMENT",
  "REPORTS_ANALYTICS",
];

async function main() {
  const hash = await bcrypt.hash(COMMON_PASSWORD, SALT_ROUNDS);

  // ── 1. SUPER_ADMIN ─────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "pingwgc@gmail.com" },
    update: { role: "SUPER_ADMIN", password: hash, isVerified: true },
    create: {
      username: "Super Admin",
      email: "pingwgc@gmail.com",
      phone: "0000000000",
      password: hash,
      role: "SUPER_ADMIN",
      isVerified: true,
    },
  });
  console.log("✅ SUPER_ADMIN:", superAdmin.email);

  // ── 2. ADMIN (Shop Owner) ──────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@blueprintcrm.com" },
    update: { role: "ADMIN", password: hash, isVerified: true },
    create: {
      username: "Shop Owner",
      email: "admin@blueprintcrm.com",
      phone: "9876543210",
      password: hash,
      role: "ADMIN",
      isVerified: true,
    },
  });
  console.log("✅ ADMIN      :", admin.email);

  // ── 3. CUSTOMER 1 ─────────────────────────────────────────────────────────
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { role: "CUSTOMER", password: hash, isVerified: true },
    create: {
      username: "Alice Customer",
      email: "alice@example.com",
      phone: "9000000001",
      password: hash,
      role: "CUSTOMER",
      isVerified: true,
    },
  });
  console.log("✅ CUSTOMER 1 :", alice.email);

  // ── 4. CUSTOMER 2 ─────────────────────────────────────────────────────────
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: { role: "CUSTOMER", password: hash, isVerified: true },
    create: {
      username: "Bob Customer",
      email: "bob@example.com",
      phone: "9000000002",
      password: hash,
      role: "CUSTOMER",
      isVerified: true,
    },
  });
  console.log("✅ CUSTOMER 2 :", bob.email);

  // ── 5. Feature Flags (all enabled) ────────────────────────────────────────
  for (const feature of ALL_FEATURES) {
    await prisma.featureFlag.upsert({
      where: { feature },
      update: {},
      create: { feature, isEnabled: true },
    });
  }
  console.log("✅ Feature flags seeded:", ALL_FEATURES.length, "flags (all enabled)");

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║          TEST CREDENTIALS (Password: Admin@1234)     ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║ SUPER_ADMIN  │ pingwgc@gmail.com                     ║");
  console.log("║ ADMIN        │ admin@blueprintcrm.com               ║");
  console.log("║ CUSTOMER 1   │ alice@example.com                     ║");
  console.log("║ CUSTOMER 2   │ bob@example.com                       ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
