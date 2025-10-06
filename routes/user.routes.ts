import express, { Request, Response, NextFunction } from "express";
const router = express.Router();

import {
  change_password,
  get_user,
  get_user_by_id,
  get_users,
  login,
  signup,
  update_user,
  update_user_address,
  update_user_password,
} from "../controllers/user.controller";
import { authenticateUser } from "../middleware/authenticateUser";

router.post(
  "/signup",
  signup as unknown as (req: Request, res: Response) => void
);
// router.post(
//   "/verify-email",
//   verifyUserEmail as unknown as (req: Request, res: Response) => void
// );

// router.post(
//   "/resend-otp",
//   resendUserOtp as unknown as (req: Request, res: Response) => void
// );
router.post(
  "/login",
  login as unknown as (req: Request, res: Response) => void
);
router.get("/get_users", get_users as unknown as (req: Request, res: Response) => void);
router.get("/get_user_by_id/:id", get_user_by_id as unknown as (req: Request, res: Response) => void);
router.post(
  "/update_user_password",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  update_user_password as unknown as (req: Request, res: Response) => void
);

router.post(
  "/update_user_address",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  update_user_address as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_user",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  get_user as unknown as (req: Request, res: Response) => void
);
router.post("/change_password", change_password as unknown as (req: Request, res: Response) => void);
router.post(
  "/update_user",
  authenticateUser as unknown as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void,
  update_user as unknown as (req: Request, res: Response) => void
);

export default router;
