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
//import Mainmenu from "./models/mainMenus.model";
import vendor_route from "./routes/vendor.routes"
import feedback_route from "./routes/feedbacke.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_LOCAL,
];
// Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, authorization");
  next();
});
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  exposedHeaders: ['x-access-token']
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any());

app.use("/user", user_route);
app.use("/products", product_route);
app.use("/menus", menus_route);
app.use("/cart", cart_route);
app.use("/order", order_route);
app.use("/offer", offer_route);
app.use("/wishlist", wishlist_route);
app.use("/feedback", feedback_route);
app.use("/vendor", vendor_route);
// MongoDB connection
const connect = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName: "proitmarket",
    });
    // const categories = await Mainmenu.find().sort({ createdAt: 1 });
  
    // // Update each category with an incremental index
    // for (let i = 0; i < categories.length; i++) {
    //   await Mainmenu.updateOne(
    //     { _id: categories[i]._id },
    //     { $set: {isActive:true } }// Start index from 1
    //   );
    // }
    
    // console.log(`Updated ${categories.length} categories with itemIndex`);
    
    // // Fetch and log the updated categories
    // const updatedCategories = await Mainmenu.find().sort({ itemIndex: 1 });
    // console.log("Updated categories with indexes:");
    // updatedCategories.forEach((cat) => {
    //   console.log(`- ${cat.menuName}: ${cat.itemIndex}`);
    // });
  
    console.log("Connected to MongoDB server");
    //process.exit(0);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};
app.use(function (
  err: { message: any; status: any },
  req: Request,
  res: Response,
  next: NextFunction
) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
});
// Server setup
app.listen(PORT, () => {
  connect();
  console.log(`Server started on port ${PORT}`);
});
