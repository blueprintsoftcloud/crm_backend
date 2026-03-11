// prisma/check-mongo.ts
// Quick script to count documents in each MongoDB collection
import "dotenv/config";
import mongoose from "mongoose";

async function check() {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.error("MONGO_URL not set");
    process.exit(1);
  }

  await mongoose.connect(url);
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();

  console.log("\n📦 MongoDB Collections:");
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name.padEnd(20)} : ${count} documents`);
  }
  await mongoose.disconnect();
  console.log("\nDone.\n");
}

check().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
