import "dotenv/config";
import mongoose from "mongoose";
import { PrismaClient } from "../generated/prisma";
import logger from "../utils/logger";

export const connectDB = async (): Promise<void> => {
  try {
    const url = process.env.DATABASE_URL;

    if (!url) {
      logger.error("❌ DATABASE_URL is missing in .env");
      throw new Error("DATABASE_URL environment variable is required");
    }

    await mongoose.connect(url);
    logger.info("✅ MongoDB connected via Mongoose");
  } catch (err) {
    logger.error("❌ Database connection failed", err);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

// Prisma client
export const prisma = new PrismaClient();

// Export all models for convenience
export {
  User,
  Address,
  Category,
  Product,
  CategoryAttribute,
  CategoryAttributeValue,
  ProductAttributeValue,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Wishlist,
  Review,
  Notification,
  Otp,
  TempUpdate,
  Coupon,
  StaffProfile,
  AuditLog,
  FeatureFlag,
  AppSetting,
  PaymentLog,
  HomeBanner,
  CustomerTracker,
} from "../models/mongoose";