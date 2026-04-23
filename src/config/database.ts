import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import logger from "../utils/logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = (): PrismaClient => {
  const url = process.env.DATABASE_URL;

  if (!url) {
    logger.error("❌ DATABASE_URL is missing in .env");
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Prisma 6: Simple initialization, URL is read from schema env("DATABASE_URL")
  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("✅ MongoDB connected via Prisma");
  } catch (err) {
    logger.error("❌ Database connection failed", err);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};