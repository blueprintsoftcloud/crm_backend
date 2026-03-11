// src/config/database.ts
// Prisma 7 client singleton using the pg driver adapter.
// dotenv must be loaded before this module is imported (done in server.js via require('dotenv').config()).

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import logger from "../utils/logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const connectDB = async (): Promise<void> => {
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect();
      logger.info("✅ PostgreSQL connected via Prisma");
      return;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        logger.warn(`⏳ Waiting for PostgreSQL... (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      } else {
        logger.error("❌ Database connection failed after all retries", err);
        process.exit(1);
      }
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info("Database disconnected");
};
