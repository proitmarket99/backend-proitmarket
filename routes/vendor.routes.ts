import express, { Request, Response, NextFunction } from "express";
const router = express.Router();

import {
  register_vendor,
  login_vendor,
  get_vendor_profile,
  update_vendor_profile,
  delete_vendor_account,
  get_all_vendors,
  update_vendor_status,
  get_vendor_products,
  get_vendor_orders,
  admin_register,
  get_vendor_by_id,
  validate_otp,
  get_admin,
} from "../controllers/vendor.controller";
import {
  authenticateVendor,
  authenticateAdmin,
} from "../middleware/authenticateUser";

// Public routes
router.post(
  "/signup",
  register_vendor as unknown as (req: Request, res: Response) => void
);
router.post(
  "/verify_otp",
  validate_otp as unknown as (req: Request, res: Response) => void
);
router.post(
  "/admin_register",
  admin_register as unknown as (req: Request, res: Response) => void
);
router.post(
  "/login",
  login_vendor as unknown as (req: Request, res: Response) => void
);

// Protected routes (require authentication)
router.get(
  "/profile",
  authenticateVendor as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_vendor_profile as unknown as (req: Request, res: Response) => void
);
router.get(
    "/get_admin",
    authenticateAdmin as unknown as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => void,
    get_admin as unknown as (req: Request, res: Response) => void
  );
router.get(
  "/vendor_products",
  (req: Request, res: Response, next: NextFunction) => {
    // First try admin auth
    authenticateAdmin(req, res, (err) => {
      if (!err) return next(); // If admin auth succeeds, continue
      // If admin auth fails, try vendor auth
      authenticateVendor(req, res, next);
    });
  },
  get_vendor_products as unknown as (req: Request, res: Response) => void
);
router.get(
  "/vendor_orders",
  authenticateVendor as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_vendor_orders as unknown as (req: Request, res: Response) => void
);
router.post(
  "/update_profile",
  authenticateVendor as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  update_vendor_profile as unknown as (req: Request, res: Response) => void
);

router.delete(
  "/profile",
  authenticateVendor as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  delete_vendor_account as unknown as (req: Request, res: Response) => void
);

// Admin routes
router.get(
  "/get_vendor_list",
  authenticateAdmin as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_all_vendors as unknown as (req: Request, res: Response) => void
);
router.get(
  "/vendor_detail/:id",
  authenticateAdmin as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_vendor_by_id as unknown as (req: Request, res: Response) => void
);
router.put(
  "/:id/status",
  authenticateVendor as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  authenticateAdmin as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  update_vendor_status as unknown as (req: Request, res: Response) => void
);

export default router;
