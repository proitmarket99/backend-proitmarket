import express, { NextFunction, Request, Response } from "express";
import {
  add_product,
  get_products,
  get_product_by_id,
  edit_product,
  change_status,
  get_products_by_query,
  getProductsByMainMenu,
  markAsBestSeller,
  createDailyOffer,
  getBestSellingProducts,
  getDailyOffers,
  getDiscountedProducts,
  getFilters,
  save_images,
  bulk_import,
  check_duplicate,
  upload_to_s3,
  change_stock_status,
  getProductsByCategory,
} from "../controllers/product.controller";
import {
  authenticateAdmin,
  authenticateUser,
  authenticateVendor,
} from "../middleware/authenticateUser";
import {
  getRecentlyViewed,
  saveRecentlyViewed,
} from "../controllers/recentlyViewed.controller";

const router = express.Router();

// Base route: /api/products
router.post(
  "/add_product",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  add_product as unknown as (req: Request, res: Response) => void
);

router.post(
  "/upload_to_s3",
  upload_to_s3 as unknown as (req: Request, res: Response) => void
);
router.post(
  "/save_images",
  save_images as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_filters",
  getFilters as unknown as (req: Request, res: Response) => void
);
router.post(
  "/check_duplicate_product",
  check_duplicate as unknown as (req: Request, res: Response) => void
);
router.post(
  "/import_product",
  (req: Request, res: Response, next: NextFunction) => {
    // First try admin auth
    authenticateAdmin(req, res, (err) => {
      if (!err) return next(); // If admin auth succeeds, continue
      // If admin auth fails, try vendor auth
      authenticateVendor(req, res, next);
    });
  },
  bulk_import as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_products",
  get_products as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_recently_viewed",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  getRecentlyViewed as unknown as (req: Request, res: Response) => void
);
router.post(
  "/save_recently_viewed",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  saveRecentlyViewed as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_products_by_query",
  get_products_by_query as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_products_by_id/:id",
  get_product_by_id as unknown as (req: Request, res: Response) => void
);
router.get(
  "/by-mainmenu/:mainMenuId",
  getProductsByMainMenu as unknown as (req: Request, res: Response) => void
);
router.get(
  "/by-category/:categoryId",
  getProductsByCategory as unknown as (req: Request, res: Response) => void
);

// Best seller routes
router.patch(
  "/:productId/best-seller",
  markAsBestSeller as unknown as (req: Request, res: Response) => void
);
router.get(
  "/best-sellers",
  getBestSellingProducts as unknown as (req: Request, res: Response) => void
);

// Daily offer routes
router.post(
  "/:productId/daily-offer",
  createDailyOffer as unknown as (req: Request, res: Response) => void
);
router.post(
  "/change_status/:productId",
  (req: Request, res: Response, next: NextFunction) => {
    // First try admin auth
    authenticateAdmin(req, res, (err) => {
      if (!err) return next(); // If admin auth succeeds, continue
      // If admin auth fails, try vendor auth
      authenticateVendor(req, res, next);
    });
  },
  change_status as unknown as (req: Request, res: Response) => void
);
router.post(
  "/change_stock_status/:productId",
  (req: Request, res: Response, next: NextFunction) => {
    // First try admin auth
    authenticateAdmin(req, res, (err) => {
      if (!err) return next(); // If admin auth succeeds, continue
      // If admin auth fails, try vendor auth
      authenticateVendor(req, res, next);
    });
  },
  change_stock_status as unknown as (req: Request, res: Response) => void
);
router.get(
  "/daily-offers",
  getDailyOffers as unknown as (req: Request, res: Response) => void
);

// Discounted products
router.get(
  "/discounted",
  getDiscountedProducts as unknown as (req: Request, res: Response) => void
);

// Existing routes
router.put(
  "/edit_product",
  (req: Request, res: Response, next: NextFunction) => {
    // First try admin auth
    authenticateAdmin(req, res, (err) => {
      if (!err) return next(); // If admin auth succeeds, continue
      // If admin auth fails, try vendor auth
      authenticateVendor(req, res, next);
    });
  },
  edit_product as unknown as (req: Request, res: Response) => void
);

export default router;
