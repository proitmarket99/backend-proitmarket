import { Request, Response } from "express";
import BuyNowSession from "../models/buyNowSession.model";
import Product from "../models/product.model";
import mongoose from "mongoose";

export const buy_now = async (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  const userId = req.user;

  try {
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });

    const sessionId = new mongoose.Types.ObjectId().toString();

    await BuyNowSession.create({
      sessionId,
      user: userId,
      items: [{ product: product._id, quantity, price: product.sellingPrice }],
      totalItems: quantity,
      totalPrice: product.sellingPrice * quantity,
    });

    res.json({ status: true, sessionId });
  } catch (err) {
    console.error("Buy now session error", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

export const get_buy_now = async (req: Request, res: Response) => {
  try {
    const session = await BuyNowSession.findOne({
      sessionId: req.params.sessionId,
    }).populate("items.product");

    if (!session) {
      return res
        .status(404)
        .json({ status: false, message: "Session expired or not found" });
    }

    res.json({ status: true, session });
  } catch (err) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};
