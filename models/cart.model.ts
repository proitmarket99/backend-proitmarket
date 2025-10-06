import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  priceAtAddTime: number; // store price at the time it was added
}

export interface IUserCart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  totalItems: number;
  totalPrice: number;
  isActive: boolean;
  updatedAt?: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1, min: 1 },
    priceAtAddTime: { type: Number, required: true },
  },
  { _id: false }
);

const userCartSchema = new Schema<IUserCart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
    totalItems: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const UserCart = mongoose.model<IUserCart>("UserCart", userCartSchema);

export default UserCart;
