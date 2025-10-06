// controllers/offer.controller.ts
import { Request, Response } from "express";
import Offer from "../models/offer.modal";
import Product from "../models/product.model";

// Create a new offer

export const import_offer = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { products } = req.body;
    const userId = req.user?.id;
    if (
      !type ||
      !products ||
      !Array.isArray(products) ||
      products?.length === 0
    ) {
      return res.status(400).send({
        status: false,
        message: "Type and at least one product are required",
        data: null,
      });
    }

    // Validate product IDs
    const productNames = products.map((p) => p.productName);
    const existingProducts = await Product.find({ name: { $in: productNames } });
    if (existingProducts.length !== productNames.length) {
      return res.status(400).send({
        status: false,
        message: "One or more products not found",
        data: null,
      });
    }

    // Validate products
    const validatedProducts = products.map((offer) => {
      const startDate = new Date(offer.startDate);
      const endDate = new Date(offer.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format");
      }

      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }

      // Find the product by name to get its ID
      const product = existingProducts.find(p => p.name === offer.productName);
      if (!product) {
        throw new Error(`Product not found: ${offer.productName}`);
      }

      return {
        productId: product._id,
        startDate,
        endDate,
        //discountPercentage: offer.discountPercentage || 0,
      };
    });

    // Check if an offer already exists with the same type
    const existingOffer = await Offer.findOne({ type });
    if (existingOffer) {
      // Filter out products that are already in the offer
      const existingProductIds = new Set(
        existingOffer.products.map((p: any) => p.productId?.toString())
      );
      const newProducts = validatedProducts.filter(
        (p) => !existingProductIds.has(p.productId?.toString())
      );

      if (newProducts.length === 0) {
        return res.status(200).send({
          status: true,
          message: "All products already exist in the offer",
          data: existingOffer,
        });
      }
      if (newProducts.length > 0) {
        existingOffer.products.push(...newProducts);
        existingOffer.updatedBy = userId;
        await existingOffer.save();
      }

      return res.status(200).send({
        status: true,
        message: "Offer updated with new products",
        data: existingOffer,
      });
    }

    // No existing offer - create a new one
    const offer = new Offer({
      type,
      products: validatedProducts,
      createdBy: userId,
      updatedBy: userId,
    });

    await offer.save();

    return res.status(201).send({
      status: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return res.status(500).send({
      status: false,
      message: error.message || "Internal server error",
      data: error,
    });
  }
};
export const createOffer = async (req: Request, res: Response) => {
  try {
    const { type, products } = req.body;
    const userId = (req as any).user?._id;

    if (
      !type ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).send({
        status: false,
        message: "Type and at least one product are required",
        data: null,
      });
    }

    // Validate product IDs
    const productIds = products.map((p) => p.productId);
    const existingProducts = await Product.find({ _id: { $in: productIds } });

    if (existingProducts.length !== productIds.length) {
      return res.status(400).send({
        status: false,
        message: "One or more products not found",
        data: null,
      });
    }

    // Validate products
    const validatedProducts = products.map((offer) => {
      const startDate = new Date(offer.startDate);
      const endDate = new Date(offer.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format");
      }

      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }

      return {
        productId: offer.productId,
        startDate,
        endDate,
        discountPercentage: offer.discountPercentage || 0,
      };
    });

    // Check if an offer already exists with the same type
    const existingOffer = await Offer.findOne({ type });

    if (existingOffer) {
      // Filter out products that are already in the offer
      const existingProductIds = new Set(
        existingOffer.products.map((p: any) => p.productId.toString())
      );
      const newProducts = validatedProducts.filter(
        (p) => !existingProductIds.has(p.productId.toString())
      );

      if (newProducts.length === 0) {
        return res.status(200).send({
          status: true,
          message: "All products already exist in the offer",
          data: existingOffer,
        });
      }

      existingOffer.products.push(...newProducts);
      existingOffer.updatedBy = userId;
      await existingOffer.save();

      return res.status(200).send({
        status: true,
        message: "Offer updated with new products",
        data: existingOffer,
      });
    }

    // No existing offer - create a new one
    const offer = new Offer({
      type,
      products: validatedProducts,
      createdBy: userId,
      updatedBy: userId,
    });

    await offer.save();

    return res.status(201).send({
      status: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return res.status(500).send({
      status: false,
      message: error.message || "Internal server error",
      data: error,
    });
  }
};

export const get_all_offers = async (req: Request, res: Response) => {
  try {
    const productLimit = parseInt(req.query.limit as string) || 10;
    
    const allOffers = await Offer.find({}, { products: { $slice: productLimit } })
    .populate("products.productId");
  
    
    return res.status(200).send({
      status: true,
      message: "Offers fetch successfully",
      data: allOffers,
    });
  } catch (error: any) {
    console.error("Error fetching offers:", error);
    return res.status(500).send({
      status: false,
      message: error.message || "Internal server error",
      data: error,
    });
  }
};
// Get all offers with optional filtering
export const getOffers = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (type) {
      query.type = type;
    }

    const [offers, total] = await Promise.all([
      Offer.find(query)
        .populate("products.productId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Offer.countDocuments(query),
    ]);
    // Extract and flatten all products from the fetched offers
    const products = offers.flatMap((offer: any) =>
      offer.products.map((p: any) => ({
        offerId: offer._id,
        product: p.productId,
        startDate: p.startDate,
        endDate: p.endDate,
      }))
    );

    return res.status(200).send({
      status: true,
      data: {
        products,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
        //offerId:offers._id
      },
    });
  } catch (error) {
    console.error("Error getting offer products:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

// Get active offers of a specific type
export const getActiveOffers = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const now = new Date();

    const offers = await Offer.aggregate([
      {
        $match: {
          type,
          "products.startDate": { $lte: now },
          "products.endDate": { $gt: now },
        },
      },
      { $unwind: "$products" },
      {
        $match: {
          "products.startDate": { $lte: now },
          "products.endDate": { $gt: now },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "products.product",
        },
      },
      { $unwind: "$products.product" },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          type: { $first: "$type" },
          products: { $push: "$products" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).send({
      success: true,
      message: "",
      data: offers,
    });
  } catch (error) {
    console.error("Error getting active offers:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

// Update an offer
export const updateOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, isActive } = req.body;
    const userId = (req as any).user?._id;

    const updateData: any = { updatedBy: userId };
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const offer = await Offer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate("products.product", "name price images");

    if (!offer) {
      return res.status(404).send({
        status: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).send({
      status: true,
      message: "Offer updated successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

// Add or update products in an offer
export const updateOfferProducts = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, productId } = req.body as {
      startDate: string;
      endDate: string;
      productId: string;
    };

    if (!productId) {
      return res.status(400).send({
        status: false,
        message: "Product ID is required",
        data: null,
      });
    }

    // Validate dates
    if (
      isNaN(new Date(startDate).getTime()) ||
      isNaN(new Date(endDate).getTime())
    ) {
      return res.status(400).send({
        status: false,
        message: "Invalid date format",
        data: null,
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).send({
        status: false,
        message: "End date must be after start date",
        data: null,
      });
    }

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({
        status: false,
        message: "Product not found",
        data: null,
      });
    }

    // Find the offer and update the specific product
    const offer = await Offer.findOneAndUpdate(
      { type: type, "products.productId": productId },
      {
        $set: {
          "products.$.startDate": new Date(startDate),
          "products.$.endDate": new Date(endDate),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!offer) {
      // If product not found in offer, add it
      const updatedOffer = await Offer.findOneAndUpdate(
        { type: type },
        {
          $push: {
            products: {
              productId,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
            },
          },
          updatedAt: new Date(),
        },
        { new: true }
      );

      return res.status(200).send({
        status: true,
        message: "Product added to offer successfully",
        data: updatedOffer,
      });
    }

    return res.status(200).send({
      status: true,
      message: "Product in offer updated successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Error updating offer products:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

// Delete an offer
export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Offer.findByIdAndUpdate(id, { isActive: false });
    if (!result) {
      return res.status(404).send({
        status: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).send({
      status: true,
      message: "Offer deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

export const getDynamicOffers = async (req: Request, res: Response) => {
  try {
    const offers = await Offer.find({
      type: { $not: { $in: [/^daily offer$/i, /^best selling$/i] } },
    }).populate("products.productId");
    return res.status(200).send({
      status: true,
      message: "Offers fetch successfully",
      data: offers,
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

export const deleteProductFromOffer = async (req: Request, res: Response) => {
  try {
    const { type, productId } = req.params;

    const result = await Offer.findOneAndUpdate(
      { type },
      { $pull: { products: { productId: productId } } }, // <-- works directly
      { new: true } // return updated doc
    );

    if (!result) {
      return res.status(404).send({
        status: false,
        message: "Offer not found",
        data: null,
      });
    }

    return res.status(200).send({
      status: true,
      message: "Product deleted successfully from offer",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};

export const delete_dynamic_offer = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const result = await Offer.findOne({ type: type });
    if (!result) {
      return res.status(404).send({
        status: false,
        message: "Offer not found",
        data: null,
      });
    }
    result.status = !result.status;
    await result.save();
    return res.status(200).send({
      status: true,
      message: "Offer status updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      data: error,
    });
  }
};
