import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    banners: {type:String}, // e.g. "COMPUTERS & LAPTOPS"
    offerName:{type:String},
    productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product"},
    status:{type:Boolean,default:true}
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;
