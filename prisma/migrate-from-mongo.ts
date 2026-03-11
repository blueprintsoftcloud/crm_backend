// prisma/migrate-from-mongo.ts
// One-time script: migrates all MongoDB data → PostgreSQL via Prisma.
// Run with: npx tsx prisma/migrate-from-mongo.ts --dry-run   (safe, no writes)
//           npx tsx prisma/migrate-from-mongo.ts             (live migration)

import "dotenv/config";
import mongoose, { ObjectId } from "mongoose";
import { prisma } from "../src/config/database";

const isDryRun = process.argv.includes("--dry-run");

// ── ID mapping tables (MongoDB ObjectId → Postgres cuid) ─────────────────────
const userIdMap = new Map<string, string>();
const categoryIdMap = new Map<string, string>();
const productIdMap = new Map<string, string>();
const orderIdMap = new Map<string, string>();

const toStr = (id: unknown): string => id?.toString() ?? "";

// ── Counters ──────────────────────────────────────────────────────────────────
const counts = {
  users: 0,
  categories: 0,
  products: 0,
  addresses: 0,
  orders: 0,
  wishlist: 0,
  carts: 0,
  notifications: 0,
  skipped: 0,
};

async function migrateUsers(db: mongoose.mongo.Db) {
  const users = await db.collection("users").find({}).toArray();
  console.log(`\n👤 Migrating ${users.length} users...`);

  for (const u of users) {
    const mongoId = toStr(u._id);
    const newId = `usr_${mongoId}`;
    userIdMap.set(mongoId, newId);

    if (!isDryRun) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: newId,
          username: u.username ?? u.email.split("@")[0],
          email: u.email,
          // phone stored as Number in MongoDB — convert to String, pad if needed
          phone: String(u.phone ?? "").replace(/\D/g, "") || "0000000000",
          password: u.password,
          role: u.role?.toUpperCase() === "ADMIN" ? "ADMIN" : "CUSTOMER",
          isVerified: true, // Existing users are considered verified
          refreshToken: null,
          createdAt: u.createdAt ?? new Date(),
          updatedAt: u.updatedAt ?? new Date(),
        },
      });
    }
    counts.users++;
  }
  console.log(
    `  ✅ ${counts.users} users ${isDryRun ? "(dry run)" : "migrated"}`,
  );
}

async function migrateCategories(db: mongoose.mongo.Db) {
  const categories = await db.collection("categories").find({}).toArray();
  console.log(`\n📂 Migrating ${categories.length} categories...`);

  for (const c of categories) {
    const mongoId = toStr(c._id);
    const newId = `cat_${mongoId}`;
    categoryIdMap.set(mongoId, newId);

    if (!isDryRun) {
      await prisma.category.upsert({
        where: { code: c.code ?? `cat-${mongoId.slice(-6)}` },
        update: {},
        create: {
          id: newId,
          code: c.code ?? `cat-${mongoId.slice(-6)}`,
          name: c.name,
          description: c.description ?? null,
          image: c.image ?? null,
          isActive: true,
          createdAt: c.createdAt ?? new Date(),
          updatedAt: c.updatedAt ?? new Date(),
        },
      });
    }
    counts.categories++;
  }
  console.log(
    `  ✅ ${counts.categories} categories ${isDryRun ? "(dry run)" : "migrated"}`,
  );
}

async function migrateProducts(db: mongoose.mongo.Db) {
  const products = await db.collection("products").find({}).toArray();
  console.log(`\n📦 Migrating ${products.length} products...`);

  for (const p of products) {
    const mongoId = toStr(p._id);
    const newId = `prd_${mongoId}`;
    productIdMap.set(mongoId, newId);

    const categoryId = categoryIdMap.get(toStr(p.category));
    if (!categoryId) {
      console.warn(
        `  ⚠️  Product "${p.name}" has unknown category ${toStr(p.category)} — skipping`,
      );
      counts.skipped++;
      continue;
    }

    if (!isDryRun) {
      await prisma.product.upsert({
        where: { code: p.code ?? `prd-${mongoId.slice(-6)}` },
        update: {},
        create: {
          id: newId,
          code: p.code ?? `prd-${mongoId.slice(-6)}`,
          name: p.name,
          description: p.description ?? null,
          price: p.price ?? 0,
          stock: p.stock ?? 0,
          image: p.image ?? null,
          images: Array.isArray(p.images) ? p.images : [],
          rating: p.rating ?? 0,
          numReviews: p.numReviews ?? 0,
          isActive: true,
          categoryId,
          createdAt: p.createdAt ?? new Date(),
          updatedAt: p.updatedAt ?? new Date(),
        },
      });
    }
    counts.products++;
  }
  console.log(
    `  ✅ ${counts.products} products ${isDryRun ? "(dry run)" : "migrated"} (${counts.skipped} skipped)`,
  );
}

async function migrateAddresses(db: mongoose.mongo.Db) {
  const addresses = await db.collection("addresses").find({}).toArray();
  console.log(`\n📍 Migrating ${addresses.length} addresses...`);

  for (const a of addresses) {
    const userId = userIdMap.get(toStr(a.user));
    if (!userId) {
      console.warn(
        `  ⚠️  Address has unknown user ${toStr(a.user)} — skipping`,
      );
      counts.skipped++;
      continue;
    }

    // GeoJSON: MongoDB stores [lng, lat]
    const coords = a.location?.coordinates ?? [];
    const longitude = coords[0] ?? null;
    const latitude = coords[1] ?? null;

    if (!isDryRun) {
      await prisma.address.create({
        data: {
          id: `addr_${toStr(a._id)}`,
          userId,
          fullAddress: a.fullAddress ?? a.address ?? "Unknown",
          city: a.city ?? "",
          state: a.state ?? "",
          zipCode: a.zipCode ?? a.zip ?? "",
          country: a.country ?? "India",
          landmark: a.landmark ?? null,
          isDefault: true,
          latitude,
          longitude,
          createdAt: a.createdAt ?? new Date(),
          updatedAt: a.updatedAt ?? new Date(),
        },
      });
    }
    counts.addresses++;
  }
  console.log(
    `  ✅ ${counts.addresses} addresses ${isDryRun ? "(dry run)" : "migrated"}`,
  );
}

async function migrateOrders(db: mongoose.mongo.Db) {
  const orders = await db.collection("orders").find({}).toArray();
  console.log(`\n🛒 Migrating ${orders.length} orders...`);

  const statusMap: Record<
    string,
    "PROCESSING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  > = {
    Processing: "PROCESSING",
    Confirmed: "CONFIRMED",
    Shipped: "SHIPPED",
    Delivered: "DELIVERED",
    Cancelled: "CANCELLED",
  };
  const payStatusMap: Record<
    string,
    "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  > = {
    Pending: "PENDING",
    Paid: "PAID",
    Failed: "FAILED",
  };

  for (const o of orders) {
    const mongoId = toStr(o._id);
    const newId = `ord_${mongoId}`;

    const userId = userIdMap.get(toStr(o.user));
    if (!userId) {
      console.warn(`  ⚠️  Order ${mongoId} has unknown user — skipping`);
      counts.skipped++;
      continue;
    }

    // Build order items — skip items with unknown products
    const validItems = (o.items ?? [])
      .map((item: any) => ({
        productId: productIdMap.get(toStr(item.product)),
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
      }))
      .filter((i: any) => i.productId);

    if (validItems.length === 0 && (o.items?.length ?? 0) > 0) {
      console.warn(
        `  ⚠️  Order ${mongoId} has no resolvable products — skipping`,
      );
      counts.skipped++;
      continue;
    }

    // Only map IDs for orders that will actually be inserted
    orderIdMap.set(mongoId, newId);

    // Shipping address snapshot (use stored or placeholder)
    const shippingAddress = {
      fullAddress: o.shippingAddress?.fullAddress ?? "Address not recorded",
      city: o.shippingAddress?.city ?? "",
      state: o.shippingAddress?.state ?? "",
      zipCode: o.shippingAddress?.zipCode ?? "",
      country: o.shippingAddress?.country ?? "India",
    };

    // POD orders have fake razorpay IDs starting with "pod_" — store as null
    const razorpayOrderId =
      o.razorpayOrderId && !o.razorpayOrderId.startsWith("pod_")
        ? o.razorpayOrderId
        : null;

    if (!isDryRun) {
      await prisma.order.create({
        data: {
          id: newId,
          userId,
          totalAmount: o.totalAmount ?? 0,
          shippingCharge: o.shippingCharge ?? 0,
          discountAmount: 0,
          taxAmount: 0,
          finalAmount: o.finalAmount ?? o.totalAmount ?? 0,
          paymentMethod: o.paymentMethod === "POD" ? "POD" : "ONLINE",
          paymentStatus: payStatusMap[o.paymentStatus] ?? "PENDING",
          orderStatus: statusMap[o.orderStatus] ?? "PROCESSING",
          razorpayOrderId,
          razorpayPaymentId: o.razorpayPaymentId ?? null,
          razorpaySignature: o.razorpaySignature ?? null,
          shippingAddress,
          createdAt: o.createdAt ?? new Date(),
          updatedAt: o.updatedAt ?? new Date(),
          items: {
            create: validItems,
          },
        },
      });
    }
    counts.orders++;
  }
  console.log(
    `  ✅ ${counts.orders} orders ${isDryRun ? "(dry run)" : "migrated"}`,
  );
}

async function migrateWishlists(db: mongoose.mongo.Db) {
  const users = await db
    .collection("users")
    .find({ wishlist: { $exists: true, $ne: [] } })
    .toArray();
  console.log(`\n💛 Migrating wishlists from ${users.length} users...`);

  for (const u of users) {
    const userId = userIdMap.get(toStr(u._id));
    if (!userId || !Array.isArray(u.wishlist)) continue;

    for (const productObjectId of u.wishlist) {
      const productId = productIdMap.get(toStr(productObjectId));
      if (!productId) continue;

      if (!isDryRun) {
        await prisma.wishlist.upsert({
          where: { userId_productId: { userId, productId } },
          update: {},
          create: { userId, productId },
        });
      }
      counts.wishlist++;
    }
  }
  console.log(
    `  ✅ ${counts.wishlist} wishlist items ${isDryRun ? "(dry run)" : "migrated"}`,
  );
}

async function migrateNotifications(db: mongoose.mongo.Db) {
  const notifications = await db.collection("notifications").find({}).toArray();
  console.log(`\n🔔 Migrating ${notifications.length} notifications...`);

  const typeMap: Record<
    string,
    | "NEW_ORDER"
    | "ORDER_UPDATE"
    | "PAYMENT_FAILED"
    | "PAYMENT_SUCCESS"
    | "LOW_STOCK"
    | "GENERAL"
  > = {
    NEW_ORDER: "NEW_ORDER",
    ORDER_UPDATE: "ORDER_UPDATE",
    PAYMENT_FAILED: "PAYMENT_FAILED",
    PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
    LOW_STOCK: "LOW_STOCK",
  };

  let migrated = 0;
  for (const n of notifications) {
    const recipientId = n.recipient
      ? userIdMap.get(toStr(n.recipient))
      : undefined;
    const orderId = n.orderId ? orderIdMap.get(toStr(n.orderId)) : undefined;
    const triggeredById = n.triggeredBy
      ? userIdMap.get(toStr(n.triggeredBy))
      : undefined;

    const type = typeMap[n.type] ?? "GENERAL";
    const recipientRole = n.recipientRole ?? "admin";

    if (!isDryRun) {
      await prisma.notification.create({
        data: {
          id: `notif_${toStr(n._id)}`,
          message: n.message ?? "",
          type,
          isRead: n.isRead ?? false,
          orderId: orderId ?? null,
          triggeredById: triggeredById ?? null,
          recipientId: recipientId ?? null,
          recipientRole,
          createdAt: n.createdAt ?? new Date(),
        },
      });
    }
    migrated++;
    counts.notifications++;
  }
  console.log(
    `  ✅ ${migrated} notifications ${isDryRun ? "(dry run)" : "migrated"}`,
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  MongoDB → PostgreSQL Migration`);
  console.log(
    `  Mode: ${isDryRun ? "🔍 DRY RUN (no database writes)" : "🚀 LIVE"}`,
  );
  console.log(`${"=".repeat(60)}`);

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("MONGO_URL not set in .env");
    process.exit(1);
  }

  // Connect to both databases
  await mongoose.connect(mongoUrl);
  console.log("✅ Connected to MongoDB");

  await prisma.$connect();
  console.log("✅ Connected to PostgreSQL");

  const db = mongoose.connection.db!;

  // Run migrations in dependency order
  await migrateUsers(db);
  await migrateCategories(db);
  await migrateProducts(db);
  await migrateAddresses(db);
  await migrateOrders(db);
  await migrateWishlists(db);
  await migrateNotifications(db);

  console.log(`\n${"=".repeat(60)}`);
  console.log("  Migration Summary");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Users        : ${counts.users}`);
  console.log(`  Categories   : ${counts.categories}`);
  console.log(`  Products     : ${counts.products}`);
  console.log(`  Addresses    : ${counts.addresses}`);
  console.log(`  Orders       : ${counts.orders}`);
  console.log(`  Wishlist     : ${counts.wishlist}`);
  console.log(`  Notifications: ${counts.notifications}`);
  console.log(`  Skipped      : ${counts.skipped}`);
  console.log(`${"=".repeat(60)}`);
  console.log(
    `\n🎉 ${isDryRun ? "Dry run complete — no data was written." : "Migration complete!"}\n`,
  );
}

main()
  .catch((err) => {
    console.error("\n❌ Migration failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
  });
