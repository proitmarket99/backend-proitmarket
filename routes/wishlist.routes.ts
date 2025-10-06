import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkInWishlist,
  clearWishlist,
} from "../controllers/wishlist.controller";
import { authenticateUser } from "../middleware/authenticateUser";
import { NextFunction, Request, Response } from "express";

const router = Router();

// GET /api/wishlist - Get user's wishlist
router.get(
  "/get_user_wishlist",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  getWishlist as unknown as (req: Request, res: Response) => void
);

// POST /api/wishlist/:productId - Add product to wishlist
router.post(
  "/add_to_wishlist/:productId",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  addToWishlist as unknown as (req: Request, res: Response) => void
);

// POST /api/wishlist/:productId - Remove product from wishlist
router.post(
  "/remove_from_wishlist/:productId",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  removeFromWishlist as unknown as (req: Request, res: Response) => void
);

// GET /api/wishlist/check/:productId - Check if product is in wishlist
router.get(
  "/check/:productId",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  checkInWishlist as unknown as (req: Request, res: Response) => void
);

// POST /api/wishlist - Clear wishlist
router.delete(
  "/",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  clearWishlist as unknown as (req: Request, res: Response) => void
);

export default router;
