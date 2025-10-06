// controllers/cart.controller.ts
import { Request, Response } from "express";
import UserCart from "../models/cart.model";
import Product from "../models/product.model";

// POST /cart
export const addOrUpdateCart = async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const price = product.sellingPrice;

    let cart = await UserCart.findOne({ user: req.user?.id });

    if (!cart) {
      cart = new UserCart({
        user: req.user?.id,
        items: [
          {
            product: productId,
            quantity,
            priceAtAddTime: price,
          },
        ],
        totalItems: quantity,
        totalPrice: price * quantity,
      });
    } else {
      const index = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (index > -1) {
        cart.items[index].quantity += quantity;
      } else {
        cart.items.push({
          product: productId,
          quantity,
          priceAtAddTime: price,
        });
      }

      cart.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
      cart.totalPrice = cart.items.reduce(
        (sum, i) => sum + i.quantity * i.priceAtAddTime,
        0
      );
    }

    await cart.save();
    res
      .status(201)
      .send({ message: "Item added to cart", status: true, data: cart });
  } catch (error) {
    res.status(500).send({ message: "Something went wrong", error });
  }
};

// GET /cart/:userId
export const getUserCart = async (req: Request, res: Response) => {
  try {
    const cart = await UserCart.findOne({ user: req.user?.id }).populate(
      "items.product"
    );
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    res.status(200).send({ message: "", status: true, data: cart });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch cart", error });
  }
};

// DELETE /cart/:userId/item/:productId
export const removeItemFromCart = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const cart = await UserCart.findOne({ user: req.user?.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    cart.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, i) => sum + i.quantity * i.priceAtAddTime,
      0
    );
    console.log(cart);
    await cart.save();
    res.status(200).send({ message: "", status: true, data: cart });
  } catch (error) {
    res.status(500).send({ message: "Failed to remove item", error });
  }
};

export const updateCart = async (req: Request, res: Response) => {
  try {
    const { id, quantity } = req.body;

    // Validate quantity is a number
    if (typeof quantity !== "number") {
      return res.status(400).json({
        message: "Quantity must be a number",
        status: false,
      });
    }

    const cart = await UserCart.findOne({ user: req.user?.id });
    if (!cart)
      return res.status(404).json({
        message: "Cart not found",
        status: false,
      });

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Item not found",
        status: false,
      });
    }

    const item = cart.items[itemIndex];

    // Calculate new quantity
    const newQuantity = item.quantity + quantity;

    // If new quantity is less than or equal to 0, remove the item
    if (newQuantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Update the quantity with the new value
      item.quantity = newQuantity;
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, i) => sum + i.quantity * i.priceAtAddTime,
      0
    );

    await cart.save();

    res.status(200).json({
      message:
        newQuantity <= 0
          ? "Item removed from cart"
          : "Cart updated successfully",
      status: true,
      data: cart,
    });
  } catch (error: any) {
    console.error("Error updating cart:", error);
    res.status(500).json({
      message: "Failed to update cart",
      error: error.message,
      status: false,
    });
  }
};