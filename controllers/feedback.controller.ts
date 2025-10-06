import { Request, Response } from "express";
import FeedbackModel from "../models/feedbacke.model";


export const add_feedback = async (req: Request, res: Response) => {
  try {
    const { userId, productId, message, rating } = req.body;
    const feedback = new FeedbackModel({
      userId,
      productId,
      message,
      rating,
    });
    await feedback.save();
    return res.status(201).json({ message: "Feedback added successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const get_feedback_by_product = async (req: Request, res: Response) => {
  try {
    const feedback = await FeedbackModel.find({ productId: req.params.id }).populate("userId").populate("productId");
    return res.status(200).json(feedback);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const get_feedback_by_user = async (req: Request, res: Response) => {
  try {
    const feedback = await FeedbackModel.find({ userId: req.params.id }).populate("userId").populate("productId");
    return res.status(200).json(feedback);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

