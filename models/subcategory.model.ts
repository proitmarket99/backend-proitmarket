import mongoose from "mongoose";

const submenuSchema = new mongoose.Schema(
  {
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    menuName: { type: String, required: true,unique: true }, // e.g. "COMPUTERS & LAPTOPS"
    slug: { type: String, required: true,unique: true }, // e.g. "computers-&-laptops"
    itemIndex:{type:Number},
    isActive:{type:Boolean,default:true}
  },
  { timestamps: true }
);

const Subcategory = mongoose.model('Subcategory', submenuSchema);

export default Subcategory;