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

const productSchema = new Schema(
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

const productOfferSchema = new Schema<IOffer>(
  {
    products: [productSchema],
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
productOfferSchema.index({
  "products.startDate": 1,
  "products.endDate": 1,
});

// Add a pre-save hook to validate product dates
productOfferSchema.pre("save", function (next) {
  const now = new Date();
  this.products = this.products.map((product) => ({
    ...product,
    isActive: product.startDate <= now && product.endDate > now,
  }));
  next();
});

const ProductOffer =
  mongoose.models.Offer || mongoose.model<IOffer>("ProductOffer", productOfferSchema);

export default ProductOffer;
