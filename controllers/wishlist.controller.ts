import { Request, Response } from "express";
import mongoose from "mongoose";
import Wishlist from "../models/wishlist.model";

export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req?.user?.id;

    const wishlist = await Wishlist.findOne({ userId })
      .populate("products")
      .lean();

    if (!wishlist) {
      return res.status(200).json({
        status: true,
        data: { products: [] },
        message: "Wishlist is empty",
      });
    }

    res.status(200).json({
      status: true,
      data: wishlist,
      message: "Wishlist retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting wishlist:", error);
    res.status(500).json({
      status: false,
      message: "Server error while fetching wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid product ID",
      });
    }

    // Find or create wishlist for user
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create new wishlist if it doesn't exist
      wishlist = new Wishlist({
        userId,
        products: [productId],
      });
      await wishlist.save();

      return res.status(201).json({
        status: true,
        message: "Product added to wishlist",
        data: wishlist,
      });
    }

    // Check if product already exists in wishlist
    if (wishlist.products.includes(new mongoose.Types.ObjectId(productId))) {
      return res.status(200).json({
        status: true,
        message: "Product already in wishlist",
        data: wishlist,
      });
    }

    // Add product to existing wishlist
    wishlist.products.push(new mongoose.Types.ObjectId(productId));
    await wishlist.save();

    const populatedWishlist = await Wishlist.findById(wishlist._id).populate(
      "products",
      "name sellingPrice images"
    );

    res.status(200).json({
      status: true,
      message: "Product added to wishlist",
      data: [],
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      status: false,
      message: "Server error while adding to wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid product ID",
      });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { products: productId } },
      { new: true }
    ).populate("products", "name sellingPrice images");

    if (!wishlist) {
      return res.status(404).json({
        status: false,
        message: "Wishlist not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Product removed from wishlist",
      data: wishlist,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      status: false,
      message: "Server error while removing from wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const checkInWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid product ID",
      });
    }

    const wishlist = await Wishlist.findOne({
      userId,
      products: productId,
    });

    res.status(200).json({
      status: true,
      data: wishlist,
      message: wishlist
        ? "Product is in wishlist"
        : "Product is not in wishlist",
    });
  } catch (error) {
    console.error("Error checking wishlist:", error);
    res.status(500).json({
      status: false,
      message: "Server error while checking wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const clearWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await Wishlist.findOneAndDelete({ userId });

    if (!result) {
      return res.status(404).json({
        status: false,
        message: "Wishlist not found or already empty",
      });
    }

    res.status(200).json({
      status: true,
      message: "Wishlist cleared successfully",
      data: { products: [] },
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({
      status: false,
      message: "Server error while clearing wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
