import mongoose from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    mainmenuId: { type: mongoose.Schema.Types.ObjectId, ref: "Mainmenu", required: true },
    menuName: { type: String, required: true,unique: true }, // e.g. "COMPUTERS & LAPTOPS"
    slug: { type: String, required: true,unique: true }, // e.g. "computers-&-laptops",
    icon: {type:String},
    itemIndex:{type:Number},
    isActive:{type:Boolean,default:true}
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', menuSchema);

export default Category;
