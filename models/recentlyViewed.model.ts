// models/RecentlyViewed.ts
import mongoose from 'mongoose';

const recentlyViewedSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
});

export default mongoose.models.RecentlyViewed ||
  mongoose.model('RecentlyViewed', recentlyViewedSchema);
