// models/offer.model.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOffer extends Document {
  type: string;
  products: Array<{
    productId: Types.ObjectId;
    startDate: Date;
    endDate: Date;
    discountPercentage?: number;
  }>;
  status: boolean;
}

const productOfferSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: any, value: Date) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
  },
  { _id: false }
);

const offerSchema = new Schema<IOffer>(
  {
    type: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    products: [productOfferSchema],
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active offers
offerSchema.index({
  type: 1,
  "products.startDate": 1,
  "products.endDate": 1,
});

// Add a pre-save hook to validate product dates
offerSchema.pre("save", function (next) {
  const now = new Date();
  this.products = this.products.map((product) => ({
    ...product,
    isActive: product.startDate <= now && product.endDate > now,
  }));
  next();
});

const Offer =
  mongoose.models.Offer || mongoose.model<IOffer>("Offer", offerSchema);

export default Offer;
