import { authenticateUser } from "../middleware/authenticateUser";
import {
  addOrUpdateCart,
  getUserCart,
  removeItemFromCart,
  updateCart,
} from "../controllers/cart.controller";
import express, { NextFunction, Request, Response } from "express";

const router = express.Router();

router.post(
  "/add_to_cart",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  addOrUpdateCart as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_user_cart",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  getUserCart as unknown as (req: Request, res: Response) => void
);
router.get(
  "/remove_item_from_cart/:productId",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  removeItemFromCart as unknown as (req: Request, res: Response) => void
);
router.post(
  "/update_cart",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  updateCart as unknown as (req: Request, res: Response) => void
);
export default router;
