import express, { Request, Response } from "express";
import {
  add_category,
  add_subcategory,
  get_categories,
  get_menu_by_id,
  get_subcategories_by_id,
  update_category,
  update_section,
  update_subcategory,
} from "../controllers/menus.controller";

const router = express.Router();

router.post(
  "/add_category",
  add_category as unknown as (req: Request, res: Response) => void
);
router.post(
  "/add_subcategory",
  add_subcategory as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_menus",
  get_categories as unknown as (req: Request, res: Response) => void
);
router.post(
  "/update_menus",
  update_category as unknown as (req: Request, res: Response) => void
);
router.post(
  "/update_section",
  update_section as unknown as (req: Request, res: Response) => void
);
router.post(
  "/update_subcategories",
  update_subcategory as unknown as (req: Request, res: Response) => void
);
router.get('/get_menu_by_id/:menuId', get_menu_by_id as unknown as (req: Request, res: Response) => void);
router.get('/get_subcategories_by_id/:categoryId', get_subcategories_by_id as unknown as (req: Request, res: Response) => void);
export default router;
