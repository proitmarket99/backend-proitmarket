import { add_feedback, get_feedback_by_product, get_feedback_by_user } from "../controllers/feedback.controller";
import express, { Request, Response } from "express";

const router = express.Router();

router.post(
  "/add_feedback",
  add_feedback as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_feedback_by_product",
  get_feedback_by_product as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_feedback_by_user",
  get_feedback_by_user as unknown as (req: Request, res: Response) => void
);
export default router;
