import mongoose from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    menuName: { type: String, required: true,unique: true }, // e.g. "COMPUTERS & LAPTOPS"
    slug: { type: String, required: true, unique: true }, // e.g. "computers-&-laptops"
    icon: {type: String},
    itemIndex:{type:Number},
    isActive:{type:Boolean,default:true}
  },
  { timestamps: true }
);

const Mainmenu = mongoose.model("Mainmenu", menuSchema);

export default Mainmenu;
