import mongoose, { Document, Schema } from 'mongoose';

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  products: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index for faster querying
wishlistSchema.index({ userId: 1 });

// Prevent duplicate products in the wishlist
wishlistSchema.path('products').validate(function(value: mongoose.Types.ObjectId[]) {
  return new Set(value).size === value.length;
}, 'Duplicate products are not allowed in wishlist');

const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema);

export default Wishlist;