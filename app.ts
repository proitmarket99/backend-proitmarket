import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import multer from "multer";
import mongoose from "mongoose";

import user_route from "./routes/user.routes";
import product_route from "./routes/product.routes";
import menus_route from "./routes/menus.routes";
import cart_route from "./routes/cart.routes";
import order_route from "./routes/order.routes";
import offer_route from "./routes/offer.routes";
import wishlist_route from "./routes/wishlist.routes";
import vendor_route from "./routes/vendor.routes";
import feedback_route from "./routes/feedbacke.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Make sure these match *exactly* (no trailing slashes)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://frontend-proitmarket.vercel.app"
];

// ✅ Proper CORS setup (no duplicate header middleware)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow requests like Postman
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
  exposedHeaders: ["x-access-token"],
}));

// ✅ Ensure OPTIONS requests are handled
app.options("*", cors());

// ✅ Other middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any());

// ✅ Routes
app.use("/user", user_route);
app.use("/products", product_route);
app.use("/menus", menus_route);
app.use("/cart", cart_route);
app.use("/order", order_route);
app.use("/offer", offer_route);
app.use("/wishlist", wishlist_route);
app.use("/feedback", feedback_route);
app.use("/vendor", vendor_route);

// ✅ MongoDB
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, { dbName: "proitmarket" });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

// ✅ Global error handler
app.use(function (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ status: false, message: err.message });
});

// ✅ Start server
app.listen(PORT, () => {
  connect();
  console.log(`🚀 Server running on port ${PORT}`);
});
