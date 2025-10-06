import mongoose, { Document, Schema } from "mongoose";

export interface IVendor extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  companyName: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  //   gstNumber?: string;
  //   panNumber?: string;
  bankDetails?: {
    accountNumber: string;
    accountHolderName: string;
    ifscCode: string;
    bankName: string;
    branch: string;
  };
  isVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  profileImage?: string;
  documents?: {
    gstCertificate?: string;
    panCard?: string;
    cancelledCheque?: string;
  };
  commissionRate: number;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  otp?: string;
  otpExpire?: Date;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Please enter your phone number"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    companyName: {
      type: String,
      required: [true, "Please enter your company name"],
      trim: true,
    },
    businessAddress: {
      street: { type: String, required: [true, "Please enter street address"] },
      city: { type: String, required: [true, "Please enter city"] },
      state: { type: String, required: [true, "Please enter state"] },
      pincode: { type: String, required: [true, "Please enter pincode"] },
      country: { type: String, default: "India" },
    },
    // gstNumber: {
    //   type: String,
    //   trim: true,
    //   uppercase: true,
    //   match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number'],
    // },
    // panNumber: {
    //   type: String,
    //   trim: true,
    //   uppercase: true,
    //   match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'],
    // },
    bankDetails: {
      accountNumber: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
      ifscCode: { type: String, trim: true, uppercase: true },
      bankName: { type: String, trim: true },
      branch: { type: String, trim: true },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
    documents: {
      gstCertificate: { type: String },
      panCard: { type: String },
      cancelledCheque: { type: String },
    },
    commissionRate: {
      type: Number,
      default: 10, // Default commission rate of 10%
      min: 0,
      max: 100,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otp: {
      type: String,
      select: false,
    },
    otpExpire: {
      type: Date,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
// vendorSchema.index({ email: 1 }, { unique: true });
// vendorSchema.index({ phone: 1 }, { unique: true });
// vendorSchema.index({ companyName: 1 });

const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);

export default Vendor;
