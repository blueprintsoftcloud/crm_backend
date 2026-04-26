import { Request, Response } from "express";
import { Wishlist, Product } from "../models/mongoose";
import logger from "../utils/logger";

// Helper: emit customer-wishlist-update to admin room via socket
const emitWishlistUpdate = (req: Request, userId: string, wishlistCount: number) => {
  try {
    const io = req.app.get("socketio");
    if (io) {
      io.to("admin-room").emit("customer-wishlist-update", { userId, wishlistCount });
    }
  } catch { /* non-critical */ }
};

// GET /api/user/wishlist  (authenticated)
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const items = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            rating: true,
            code: true,
            stock: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      message: "Wishlist fetched successfully",
      items: items.map((i: any) => i.product),
      count: items.length,
    });
  } catch (err: any) {
    logger.error("getWishlist error", err);
    res.status(500).json({ message: "Error fetching wishlist" });
  }
};

// POST /api/user/wishlist  (authenticated)
export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Upsert — idempotent, duplicate is no-op
    await prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {}, // already exists — no change needed
    });

    const count = await prisma.wishlist.count({ where: { userId } });

    res
      .status(200)
      .json({
        message: "Product added to wishlist successfully",
        wishlistCount: count,
      });
    emitWishlistUpdate(req, userId, count);
  } catch (err: any) {
    logger.error("addToWishlist error", err);
    res.status(500).json({ message: "Error adding to wishlist" });
  }
};

// DELETE /api/user/wishlist/:productId  (authenticated)
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId as string;

    await prisma.wishlist.deleteMany({ where: { userId, productId } });

    const count = await prisma.wishlist.count({ where: { userId } });

    res
      .status(200)
      .json({
        message: "Product removed from wishlist successfully",
        wishlistCount: count,
      });
    emitWishlistUpdate(req, userId, count);
  } catch (err: any) {
    logger.error("removeFromWishlist error", err);
    res.status(500).json({ message: "Error removing from wishlist" });
  }
};

// DELETE /api/user/wishlist  (authenticated)
export const clearWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.wishlist.deleteMany({ where: { userId } });

    res
      .status(200)
      .json({ message: "Wishlist cleared successfully", wishlistCount: 0 });
  } catch (err: any) {
    logger.error("clearWishlist error", err);
    res.status(500).json({ message: "Error clearing wishlist" });
  }
};
