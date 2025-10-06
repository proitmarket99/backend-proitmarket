import mongoose, { Schema, Document, model } from 'mongoose';

export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  message: string;
  rating?: number;
  response?: string;
  createdAt: Date;
}

const FeedbackSchema: Schema<IFeedback> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    response: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default model<IFeedback>('Feedback', FeedbackSchema);
