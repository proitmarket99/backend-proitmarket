import { Request, Response } from "express";
import RecentlyViewedModel from "../models/recentlyViewed.model";

export const saveRecentlyViewed = async (req: Request, res: Response) => {
  try {
    const userId = req?.user?.id;
    if (!userId) {
      return res.status(400).send({ message: "Your are not logged in", status: false, data: [] });
    }
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).send({ message: "Missing productId", status: false, data: [] });
    }
    const existing = await RecentlyViewedModel.findOne({ userId });
    if (existing) {
      const updatedProducts = [
        productId,
        ...existing.products.filter(
          (id: string) => id.toString() !== productId
        ),
      ].slice(0, 10);

      existing.products = updatedProducts;
      await existing.save();
    } else {
      await RecentlyViewedModel.create({ userId, products: [productId] });
    }
    return res
      .status(200)
      .send({
        message: "Recently viewed saved successfully",
        status: true,
        data: productId,
      });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to save recently viewed",
      status: false,
      data: error,
    });
  }
};

export const getRecentlyViewed = async (req: Request, res: Response) => {
  try {
    const userId = req?.user?.id;
    if (!userId) {
      return res.status(400).send({ message: "Your are not logged in", status: false, data: [] });
    }
    const recentlyViewed = await RecentlyViewedModel.findOne({ userId }).populate('products');
    if (!recentlyViewed) {
      return res.status(404).send({ message: "Recently viewed not found", status: false, data: [] });
    }
    return res.status(200).send({
      message: "Recently viewed retrieved successfully",
      status: true,
      data: recentlyViewed.products,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Failed to get recently viewed",
      status: false,
      data: error,
    });
  }
};
