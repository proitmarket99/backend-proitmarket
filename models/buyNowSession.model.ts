import mongoose from "mongoose";

const buyNowSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
    },
  ],
  totalItems: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60, // ⏰ TTL in seconds (1 hour)
  },
});

const BuyNowSession = mongoose.model("BuyNowSession", buyNowSessionSchema);
export default BuyNowSession;
