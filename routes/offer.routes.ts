// routes/offer.routes.ts
import express, { Request, Response } from "express";
import {
  createOffer,
  getOffers,
  getActiveOffers,
  updateOffer,
  updateOfferProducts,
  deleteOffer,
  get_all_offers,
  getDynamicOffers,
  deleteProductFromOffer,
  delete_dynamic_offer,
  import_offer,
} from "../controllers/offer.controller";
import { add_banner, edit_banner, get_banners } from "../controllers/bsnners.controller";
import { authenticateAdmin } from "../middleware/authenticateUser";
const router = express.Router();

// Admin routes
router.post(
  "/add_offers",
  createOffer as unknown as (req: Request, res: Response) => void
);
router.post(
  "/add_banner",
  authenticateAdmin as unknown as (req: Request, res: Response) => void,
  add_banner as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_banners",
  get_banners as unknown as (req: Request, res: Response) => void
);
router.post(
  "/edit_banner",
  authenticateAdmin as unknown as (req: Request, res: Response) => void,
  edit_banner as unknown as (req: Request, res: Response) => void
)
router.get(
  "/get_all_offers",
  get_all_offers as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_offers/:type",
  getOffers as unknown as (req: Request, res: Response) => void
);
router.get(
  "/get_dynamic_offers",
  getDynamicOffers as unknown as (req: Request, res: Response) => void
);
router.get(
  "/active/:type",
  getActiveOffers as unknown as (req: Request, res: Response) => void
);

router.post(
  "/:id",
  updateOffer as unknown as (req: Request, res: Response) => void
);

router.post(
  "/update_offers/:type",
  updateOfferProducts as unknown as (req: Request, res: Response) => void
);
router.post(
  "/import_offer/:type",
  import_offer as unknown as (req: Request, res: Response) => void
);
router.post(
  "/delete_product_from_offer/:type/:productId",
  authenticateAdmin as unknown as (req: Request, res: Response) => void,
  deleteProductFromOffer as unknown as (req: Request, res: Response) => void
);
router.post(
  "/delete_dynamic_offer/:type",
  authenticateAdmin as unknown as (req: Request, res: Response) => void,
  delete_dynamic_offer as unknown as (req: Request, res: Response) => void
);
router.delete(
  "/:id",
  deleteOffer as unknown as (req: Request, res: Response) => void
);

export default router;
