import { Router } from "express";
import {
  getAllCategories,
  getAllProducts,
  getProductsByCategoryId,
  productCard,
  getProfile,
  searchProducts,
  globalSearch,
  createProductReview,
  getProductFilters,
} from "../controllers/product-user.controller";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlist.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { reviewSchema } from "../schemas/user.schema";

const router = Router();

// Public product/category browsing
router.get("/shop/categories", getAllCategories);
router.get("/shop/products", getAllProducts);
router.get("/shop/global-search", globalSearch);
router.get("/shop/product/:productId", productCard);
router.get("/shop/categories/:categoryId", getProductsByCategoryId);
router.get("/shop/categories/:categoryId/filters", getProductFilters);
router.get("/products/search", searchProducts);

// Authenticated user
router.get("/profile", authMiddleware, getProfile);
router.post("/:id/reviews", authMiddleware, validate(reviewSchema), createProductReview);

// Wishlist
router.get("/wishlist", authMiddleware, getWishlist);
router.post("/wishlist", authMiddleware, addToWishlist);
router.delete("/wishlist/:productId", authMiddleware, removeFromWishlist);
router.delete("/wishlist", authMiddleware, clearWishlist);

// Note: profile-update routes are added once updateProfile.controller.ts is migrated.

export default router;
