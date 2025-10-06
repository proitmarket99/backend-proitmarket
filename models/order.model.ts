import mongoose, { Schema, Document, Types } from "mongoose";
import { Address } from "./user.model";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface IShippingAddress {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  orderId: string;
  orderItems: IOrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address: string;
  };
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isDelivered: boolean;
  deliveredAt?: Date;
  isCancelled: boolean;
  cancelledAt?: Date;
  status: { orderStatus: string; statusDateTime: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    },
    orderItems: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    //paymentMethod: { type: String, required: true },
    // paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    // paymentResult: {
    //   id: String,
    //   status: String,
    //   update_time: String,
    //   email_address: String,
    // },
    itemsPrice: { type: Number, required: true },
    taxPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
    isCancelled: { type: Boolean, default: false },
    cancelledAt: Date,
    status: [
      {
        orderStatus: {
          type: String,
          enum: [
            "ordered",
            "shipped",
            "delivered",
            "out for delivery",
            "cancelled",
          ],
          default: "ordered",
        },
        statusDateTime: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);

export default Order;
