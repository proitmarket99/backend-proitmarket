import mongoose, { Schema, Document, ObjectId } from "mongoose";

export interface Address {
  toObject(): Address;
  _id: ObjectId;
  fullName: string;
  phone: string;
  pincode: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  addressType: "Home" | "Work" | "Other";
  isDefault?: boolean;
}
// Define the User interface that extends mongoose's Document
export interface IUser extends Document {
  _id: ObjectId;
  adminId: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  addresses: Address[];
  otp?: string;
  otpExpire?: Date;
  isEmailVerified: boolean;
}
const addressSchema = new Schema<Address>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    addressType: {
      type: String,
      enum: ["Home", "Work", "Other"],
      required: true,
    },
    isDefault: { type: Boolean, default: false },
  },
);
// Create the user schema
const userSchema: Schema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: {
      type: String,
      required: [true, "Full name is required"],
      maxLength: [30, "Full name should be less than 30 characters"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      match: [/\w+([\.-]?\w)*@\w+([\.-]?\w)*(\.\w{2,3})+$/, "Invalid email id"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    addresses: {
      type: [addressSchema],
      validate: [arrayLimit, "{PATH} exceeds the limit of 3"],
      default: [],
    },
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
  { timestamps: true }
);
function arrayLimit(val: Address[]) {
  return val.length <= 3;
}
// Export the mongoose model with the IUser interface
const User = mongoose.model<IUser>("User", userSchema);
export default User;
