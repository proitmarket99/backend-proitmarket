import express, { NextFunction, Request, Response } from "express";
import {
  create_order,
  get_daily_orders,
  get_monthly_orders,
  get_order_by_category,
  get_order_by_id,
  get_orders,
  get_total_revenue,
  get_user_orders,
  get_yearly_orders,
  query_orders,
  update_order,
  get_top_selling_products_by_subcategory,
  get_top_selling_products,
} from "../controllers/order.controller";
import { authenticateUser } from "../middleware/authenticateUser";
import { buy_now, get_buy_now } from "../controllers/buyNowSession.controller";

const router = express.Router();

// Create new order
router.post(
  "/create_order",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  create_order as unknown as (req: Request, res: Response) => void
);
router.post("/buy_now",authenticateUser as unknown as (
  req: Request,
  res: Response,
  next: NextFunction
) => void, buy_now as unknown as (req: Request, res: Response) => void);
router.get("/buy_now/:sessionId", get_buy_now as unknown as (req: Request, res: Response) => void);
router.get(
  "/get_order_by_id/:orderId",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_order_by_id as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_total_orders",
  get_orders as unknown as (req: Request, res: Response) => void
);
router.get(
  "/query",
  query_orders as unknown as (req: Request, res: Response) => void
);
router.get(
  "/total_revenue",
  get_total_revenue as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_monthly_orders",
  get_monthly_orders as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_yearly_orders",
  get_yearly_orders as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_daily_orders",
  get_daily_orders as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_order_by_category",
  get_order_by_category as unknown as (req: Request, res: Response) => void
);
router.get(
  "/user_orders",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_user_orders as unknown as (req: Request, res: Response) => void
);
// Get order by ID
router.get(
  "/get_order_by_id/:id",
  get_order_by_id as unknown as (req: Request, res: Response) => void
);
// Update order by ID
router.post(
  "/update_order/:id",
  update_order as unknown as (req: Request, res: Response) => void
);

// Get top selling products by subcategory
router.get(
  "/top_selling_by_subcategory",
  get_top_selling_products_by_subcategory as unknown as (req: Request, res: Response) => void
);

// Get top selling products
router.get(
  "/top_selling_products",
  get_top_selling_products as unknown as (req: Request, res: Response) => void
);

export default router;
