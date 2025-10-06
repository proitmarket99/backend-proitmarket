import mongoose, { Document, Schema, ObjectId, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  headerName: string;
  brand: string;
  vendorId: Types.ObjectId;
  modelNumber: string;
  itemCode: string;
  //sku: string;
  category: ObjectId;
  section: ObjectId;
  subcategory: ObjectId;
  description: string;
  images: string[];
  tags: string[];
  actualPrice: number;
  pluCode: string;
  sellingPrice: number;
  discount?: number;
  stock: number;
  warranty?: string;
  manufacturingDate: Date;
  weight?: string;
  size?: string;
  specifications: [
    {
      section: String;
      _id: false;
      specs: [
        {
          label: String;
          value: Schema.Types.Mixed;
          _id: false;
        }
      ];
    }
  ];
  ratings?: number;
  reviewsCount?: number;
  dailyOfferExpiry?: Date;
  salesCount?: number;
  createdBy?: mongoose.Types.ObjectId;
  discountPercentage?: number;
  isActive: boolean;
  isInStock: boolean;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true, unique: true },
    headerName:{type:String,required:true},
    brand: { type: String, required: true, trim: true, index: true },
    vendorId:{       type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,},
    itemCode: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    },
    modelNumber: { type: String, trim: true },
    // sku: { type: String, unique: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mainmenu",
      required: true,
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    pluCode: { type: String, trim: true },
    images: [String],
    tags: [String],
    actualPrice: { type: Number, min: 0, required: true },
    sellingPrice: { type: Number, min: 0, required: true },
    discount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    warranty: { type: String },
    manufacturingDate: { type: Date },
    weight: { type: String },
    size: { type: String },
    specifications: [
      {
        _id: false,
        section: { type: String, required: true },
        specs: [
          {
            _id: false,
            label: { type: String, required: true },
            value: { type: Schema.Types.Mixed, required: true },
          },
        ],
      },
    ],
    dailyOfferExpiry: { type: Date, index: true },
    salesCount: { type: Number, default: 0, index: true },
    ratings: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isInStock: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function (this: IProduct) {
  if (this.actualPrice > 0) {
    return Math.round(
      ((this.actualPrice - this.sellingPrice) / this.actualPrice) * 100
    );
  }
  return 0;
});

// Indexes for better query performance
productSchema.index({ salesCount: -1, isActive: 1 });

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;
