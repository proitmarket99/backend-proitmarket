import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import Vendor, { IVendor } from "../models/vendor.model";
import Product from "../models/product.model";
import Order from "../models/order.model";
import mongoose from "mongoose";
import Admin, { IAdmin } from "../models/admin.models";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";

// Generate JWT Token
const generateToken = (id: string, role: string): string => {
  const secretKey = process.env.JWT_SECRET_KEY || "your-secret-key";
  return jwt.sign({ userId: id, role }, secretKey, { expiresIn: "30d" });
};

// @desc    Register a new vendor
// @route   POST /api/vendors/register
// @access  Public
export const register_vendor = async (req: Request, res: Response) => {
  try {
    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password, companyName, businessAddress } =
      req.body;

    // Check if vendor already exists
    const vendorExists = await Vendor.findOne({ $or: [{ email }, { phone }] });
    if (vendorExists) {
      return res.status(400).json({
        success: false,
        message: "Vendor already exists with this email or phone",
      });
    }

    // Generate OTP
    const otp = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Set OTP expiry to 10 minutes from now
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      // Send verification email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "noreply@drcbd.com",
        to: email,
        subject: "Email Verification Mail By ProitMarket",
        text: `Hello ${name},

Thank you for choosing ProitMarket. Please use this OTP ${otp} to complete your Sign Up procedures and verify your account on ProitMarket website.

This OTP is valid for 10 minutes.

Remember, Never share this OTP with anyone.

Regards,
ProitMarket Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${name},</h2>
            <p>Thank you for choosing ProitMarket. Please use the OTP below to complete your registration:</p>
            <div style="background: #f4f4f4; padding: 10px; margin: 20px 0; text-align: center; font-size: 24px; letter-spacing: 5px;">
              <strong>${otp}</strong>
            </div>
            <p>This OTP is valid for 10 minutes.</p>
            <p><strong>Important:</strong> Never share this OTP with anyone.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p>Best regards,<br>DR.CBD Team</p>
          </div>
        `,
      });

      // Create vendor with OTP
      const vendor = await Vendor.create({
        name,
        email,
        phone,
        password: hashedPassword,
        companyName,
        businessAddress,
        otp,
        otpExpire,
        isEmailVerified: false,
      });

      // Don't send sensitive data in response
      const vendorResponse = {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        companyName: vendor.companyName,
        isEmailVerified: vendor.isEmailVerified,
      };

      return res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email for OTP to verify your account.",
        user: vendorResponse,
      });
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in vendor registration:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

export const validate_otp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find vendor by email and include OTP fields
    const vendor = await Vendor.findOne({ email }).select("+otp +otpExpire");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found with this email",
      });
    }

    // Check if email is already verified
    if (vendor.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Check if OTP matches and is not expired
    if (vendor.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!vendor.otpExpire || new Date() > vendor.otpExpire) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Update vendor to mark email as verified and clear OTP
    vendor.isEmailVerified = true;
    vendor.otp = undefined;
    vendor.otpExpire = undefined;
    vendor.isActive = true; // Activate the vendor account
    await vendor.save();

    // Generate JWT token
    const token = generateToken(vendor._id.toString(), "vendor");

    // Prepare response without sensitive data
    const vendorResponse = {
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      companyName: vendor.companyName,
      isEmailVerified: vendor.isEmailVerified,
    };

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: vendorResponse,
    });
  } catch (error) {
    console.error("Error in OTP validation:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during OTP validation",
    });
  }
};

export const admin_register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const admin: IAdmin = await Admin.create({
      email,
      password: hashedPassword,
    });
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin registration failed",
      });
    } else {
      const token = generateToken(admin._id.toString(), "admin");
      const adminResponse = admin.toObject() as Omit<IAdmin, "password"> & {
        password?: string;
      };
      delete adminResponse?.password;
      res.status(201).json({
        status: true,
        message: "Registration successfully",
        data: { adminResponse, token },
      });
    }
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      status: false,
      message: "Server error during login",
      error: error?.message,
    });
  }
};

export const get_admin = async (req: Request, res: Response) => {
  try {
    const admin = await Admin.findById(req.user?.id).select("-password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Admin fetched successfully",
      data: admin,
    });
  } catch (error: any) {
    console.error("Get admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error?.message,
    });
  }
};

// @desc    Authenticate vendor & get token
// @route   POST /api/vendors/login
// @access  Public
export const login_vendor = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let user: any = null;
    let userType: "admin" | "vendor" | null = null;

    // Check for Admin first
    const admin = await Admin.findOne({ email }).select("+password");
    if (admin) {
      user = admin;
      userType = "admin";
    } else {
      // Check for Vendor
      const vendor = await Vendor.findOne({ email }).select("+password");
      if (!vendor) {
        return res.status(401).json({
          status: false,
          message: "Invalid credentials",
        });
      }

      if (!vendor.isActive) {
        return res.status(403).json({
          status: false,
          message: "Account is deactivated. Please contact support.",
        });
      }

      user = vendor;
      userType = "vendor";
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    // Update lastLogin (only for vendor)
    if (userType === "vendor") {
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), userType);

    // Prepare response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      status: true,
      message: "Login successfully",
      token,
      data: {
        user: userResponse,
        isAdmin: userType === "admin",
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      status: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Get vendor profile
// @route   GET /api/vendors/profile
// @access  Private (Vendor)
export const get_vendor_profile = async (req: Request, res: Response) => {
  try {
    const vendor = await Vendor.findById(req.user?.id).select("-password");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).send({
      status: true,
      message: "Vendor profile fetched successfully",
      data: vendor,
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const get_vendor_by_id = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id).select("-password");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).send({
      status: true,
      message: "Vendor profile fetched successfully",
      data: vendor,
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private (Vendor)
export const update_vendor_profile = async (req: Request, res: Response) => {
  try {
    const updates = { ...req.body };

    // Remove fields that shouldn't be updated
    delete updates.email;
    delete updates.isVerified;
    delete updates.isActive;

    // Handle password update if provided
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // Handle business address update if provided
    if (updates.businessAddress) {
      const { street, city, state, pincode, country } = updates.businessAddress;
      if (!street || !city || !state || !pincode) {
        return res.status(400).json({
          status: false,
          message:
            "All business address fields (street, city, state, pincode) are required",
        });
      }
    }

    // Handle business information updates
    if (updates.companyName) {
      updates.companyName = updates.companyName.trim();
    }

    // If updating bank details, make sure all required fields are present
    // if (updates.bankDetails) {
    //   const { accountNumber, accountHolderName, ifscCode, bankName } =
    //     updates.bankDetails;
    //   if (!accountNumber || !accountHolderName || !ifscCode || !bankName) {
    //     return res.status(400).json({
    //       status: false,
    //       message: "All bank details are required",
    //     });
    //   }
    // }

    const vendor = await Vendor.findByIdAndUpdate(
      req.user?.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!vendor) {
      return res.status(404).json({
        status: false,
        message: "Vendor not found",
        data: null,
      });
    }

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: vendor,
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete vendor account
// @route   DELETE /api/vendors/profile
// @access  Private (Vendor)
export const delete_vendor_account = async (req: Request, res: Response) => {
  try {
    const vendor = await Vendor.findById(req.user);

    if (!vendor) {
      return res.status(404).json({
        status: false,
        message: "Vendor not found",
      });
    }

    // Instead of deleting, we'll deactivate the account
    vendor.isActive = false;
    await vendor.save();

    res.json({
      status: true,
      message: "Account deactivated successfully",
    });
  } catch (error: any) {
    console.error("Delete account error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all vendors (Admin only)
// @route   GET /api/vendors
// @access  Private (Admin)
export const get_all_vendors = async (req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find({}).select("-password");

    res.json({
      status: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error: any) {
    console.error("Get all vendors error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update vendor status (Admin only)
// @route   PUT /api/vendors/:id/status
// @access  Private (Admin)
export const update_vendor_status = async (req: Request, res: Response) => {
  try {
    const { isActive, isVerified } = req.body;

    if (typeof isActive === "undefined" && typeof isVerified === "undefined") {
      return res.status(400).json({
        status: false,
        message:
          "Please provide at least one field to update (isActive or isVerified)",
      });
    }

    const updateData: { isActive?: boolean; isVerified?: boolean } = {};
    if (typeof isActive !== "undefined") updateData.isActive = isActive;
    if (typeof isVerified !== "undefined") updateData.isVerified = isVerified;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!vendor) {
      return res.status(404).json({
        status: false,
        message: "Vendor not found",
      });
    }

    res.json({
      status: true,
      message: "Vendor status updated successfully",
      data: vendor,
    });
  } catch (error: any) {
    console.error("Update vendor status error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const get_vendor_products = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      id,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sort = "newest",
      page = "1",
      limit = "10",
      vendorId,
    } = req.query as {
      id?: string;
      category?: string;
      brand?: string;
      minPrice?: string;
      maxPrice?: string;
      search?: string;
      sort?: string;
      page?: string;
      limit?: string;
      vendorId?: string;
    };
    // If ID is provided, return a single product by ID
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.status(200).json({ product });
    }

    // Build query object for filters
    const query: any = {};
    const vendor = await Vendor.findById(userId);
    if (vendor) {
      query.vendorId = new mongoose.Types.ObjectId(userId);
    } else {
      query.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      query.category = new mongoose.Types.ObjectId(category);
    }
    if (brand) query.brand = brand;

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { description: regex },
        { modelNumber: regex },
      ];
    }
    // Sorting
    const sortBy: any = {};
    switch (sort) {
      case "price_asc":
        sortBy.sellingPrice = 1;
        break;
      case "price_desc":
        sortBy.sellingPrice = -1;
        break;
      case "bestselling":
        sortBy.salesCount = -1;
        break;
      case "rating":
        sortBy.ratings = -1;
        break;
      case "newest":
        sortBy.createdAt = -1;
        break;
      default:
        sortBy.createdAt = -1;
    }

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select("-__v -createdAt -updatedAt")
      .sort(sortBy)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const totalPages = Math.ceil(total / perPage);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return res.status(200).send({
      message: "",
      status: true,
      data: {
        products,
        pagination: {
          currentPage,
          perPage,
          totalItems: total,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? currentPage + 1 : null,
          previousPage: hasPreviousPage ? currentPage - 1 : null,
        },
      },
    });
  } catch (error: any) {
    res.status(500).send({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const get_vendor_orders = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id; // Get vendor ID from authenticated user
    //const { status, page = '1', limit = '10' } = req.query;

    // First, find all products that belong to this vendor
    const vendorProducts = await Product.find({ vendorId }, "_id");
    const productIds = vendorProducts.map((p) => p._id);

    // Build the query to find orders that have items with these product IDs
    const query: any = {
      "orderItems.product": { $in: productIds },
    };

    // // Add status filter if provided
    // if (status) {
    //   query.status = status;
    // }

    // // Pagination
    // const pageNumber = parseInt(page as string) || 1;
    // const pageSize = parseInt(limit as string) || 10;
    // const skip = (pageNumber - 1) * pageSize;

    // Get total count for pagination
    //const total = await Order.countDocuments(query);

    // Get orders with pagination
    const orders = await Order.find(query)
      .populate("user", "name email") // Populate user details
      .populate({
        path: "orderItems.product",
        select: "name price vendorId",
        populate: {
          path: "vendorId",
          select: "storeName", // Include vendor name if needed
        },
      })
      .sort({ createdAt: -1 }); // Sort by newest first
    // .skip(skip)
    // .limit(pageSize);
    // Filter items to only include those from this vendor
    const filteredOrders = orders.map((order) => ({
      ...order.toObject(),
      items: order.orderItems.filter(
        (item: { product: { _id: any } }) =>
          item.product &&
          productIds.some((id: any) => id.equals(item.product._id))
      ),
    }));

    res.status(200).json({
      status: true,
      message: "Vendor orders fetched successfully",
      data: filteredOrders,
      // {
      //   orders: filteredOrders,
      //   pagination: {
      //     total,
      //     page: pageNumber,
      //     pageSize,
      //     totalPages: Math.ceil(total / pageSize),
      //     hasNextPage: pageNumber * pageSize < total,
      //     hasPreviousPage: pageNumber > 1
      //   }
      // }
    });
  } catch (error: any) {
    console.error("Get vendor orders error:", error);
    res.status(500).send({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};
