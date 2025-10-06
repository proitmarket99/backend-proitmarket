import { Request, Response } from "express";
import Order from "../models/order.model";
import mongoose from "mongoose";
import UserCart from "../models/cart.model";
import User from "../models/user.model";
import { IProduct } from "../models/product.model";

export const create_order = async (req: Request, res: Response) => {
  try {
    const { addressId } = req.body;
    const userId = req.user;

    // 1. Fetch the user cart
    const cart = await UserCart.findOne({ user: userId }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res
        .status(400)
        .send({
          success: false,
          message: "Cart is empty or not found",
          data: null,
        });
    }

    // 2. Get shipping address from user
    const user = await User.findById(userId);
    const selectedAddress = user?.addresses.find(
      (addr) => addr._id?.toString() === addressId
    );
    if (!selectedAddress) {
      return res
        .status(400)
        .send({ success: false, message: "Address not found", data: null });
    }

    const orderItems = cart.items.map((item) => {
      const product = item.product as unknown as IProduct;

      return {
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: item.priceAtAddTime,
        image: product.images[0], // or whatever logic to get image
        salesCount: product.salesCount || 0,
      };
    });

    const itemsPrice = cart.totalPrice;
    const taxPrice = +(itemsPrice * 0.1).toFixed(2); // 10% tax
    const shippingPrice = itemsPrice > 1000 ? 0 : 50;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    const order = await Order.create({
      user: userId,
      orderItems,
      shippingAddress: {
        fullName: selectedAddress.fullName,
        address: selectedAddress.address,
        city: selectedAddress.city,
        postalCode: selectedAddress.pincode,
        country: selectedAddress.state,
        phone: selectedAddress.phone,
      },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    // 4. Clear the cart
    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;
    await cart.save();

    // 5. Update sales count for each product in the order
    const productUpdates = orderItems.map(item => {
      return {
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { salesCount: item?.salesCount + item.quantity } },
        },
      };
    });

    if (productUpdates.length > 0) {
      await mongoose.model('Product').bulkWrite(productUpdates);
    }

    res.status(201).send({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ status: false, message: "Failed to create order", error });
  }
};

export const get_orders = async (req: Request, res: Response) => {
  try {
    const order = await Order.find();

    if (!order) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }

    res.status(200).json({ status: true,message:"", data:order });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch order", error });
  }
};
export const get_user_orders = async (req: Request, res: Response) => {
  try {
    const userId = req.user;
    const orders = await Order.find({ user: userId });

    if (!orders) {
      return res
        .status(404)
        .send({ status: false, message: "Orders not found", data: [] });
    }

    res
      .status(200)
      .send({
        status: true,
        message: "orders fetch successfully",
        data: orders,
      });
  } catch (error) {
    res
      .status(500)
      .send({ status: false, message: "Failed to fetch orders", data: error });
  }
};
// Get order by ID
export const get_order_by_id = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid order ID" });
    }

    const order = await Order.findOne({ _id: orderId }).populate("user", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }

    res.status(200).json({ message:"",status: true, data:order });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch order", error });
  }
};

export const query_orders = async (req: Request, res: Response) => {
  try {
    const { user, status, from, to, page = "1", limit = "10" } = req.query;

    const query: any = {};

    if (user && mongoose.Types.ObjectId.isValid(user as string)) {
      query.user = user;
    }

    if (status) {
      query.status = status;
    }

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from as string);
      if (to) query.createdAt.$lte = new Date(to as string);
    }

    const pageNumber = parseInt(page as string, 10) || 1;
    const pageSize = parseInt(limit as string, 10) || 10;

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    res.status(200).json({
      status: true,
      total,
      page: pageNumber,
      pageSize,
      orders,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Order query failed", error });
  }
};

// Update order
export const update_order = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid order ID" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updates, {
      new: true,
    });

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }

    res.status(200).json({ status: true, order: updatedOrder });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update order", error });
  }
};

export const get_total_revenue = async (req: Request, res: Response) => {
  try {
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);
    res.status(200).json({ message: "", status: true, data: totalRevenue[0]?.totalRevenue });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch total revenue", error });
  }
};

export const get_monthly_orders = async (req: Request, res: Response) => {
  try {
    const monthlyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json({ message: "", status: true, data: monthlyOrders });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch monthly orders", error });
  }
};

export const get_yearly_orders = async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get monthly orders for the current year
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$totalPrice" }
        }
      },
      {
        $sort: { "_id": 1 } // Sort by month number (1-12)
      }
    ]);

    // Month names for mapping
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // Create a map of all months with 0 values
    const allMonths = monthNames.map((month, index) => ({
      month,
      monthNumber: index + 1,
      totalOrders: 0,
      totalAmount: 0
    }));

    // Update with actual data
    monthlyOrders.forEach(order => {
      const monthIndex = order._id - 1; // Convert to 0-based index
      if (monthIndex >= 0 && monthIndex < 12) {
        allMonths[monthIndex].totalOrders = order.totalOrders;
        allMonths[monthIndex].totalAmount = order.totalAmount || 0;
      }
    });

    // Format the response
    const result = allMonths.map(month => ({
      month: month.month,
      totalOrders: month.totalOrders,
      totalAmount: month.totalAmount
    }));

    res.status(200).json({ 
      status: true, 
      message: "Yearly orders retrieved successfully",
      data: result 
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch yearly orders", error });
  }
};

export const get_daily_orders = async (req: Request, res: Response) => {
  try {
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json({ message: "", status: true, data: dailyOrders });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch daily orders", error });
  }
};

export const get_order_by_category = async (req: Request, res: Response) => {
  try {
    // Get all categories
    const categories = await mongoose.model('Subcategory').find({}).select('menuName');
    
    // Get all orders with populated product and category details
    const allOrders = await Order.find({})
      .populate({
        path: 'orderItems.product',
        populate: {
          path: 'category',
          model: 'Subcategory',
          select: 'menuName'
        }
      });

    // Calculate total sales per category
    const categorySales = new Map();
    let totalSales = 0;

    // Initialize all categories with 0 sales
    categories.forEach(cat => {
      categorySales.set(cat._id.toString(), {
        id: cat._id.toString(),
        value: 0,      // Will store percentage
        amount: 0,     // Actual sales amount
        label: cat.menuName
      });
    });

    // Calculate sales per category
    allOrders.forEach(order => {
      order.orderItems.forEach((item: any) => {
        if (item.product?.category) {
          const categoryId = item.product.category._id.toString();
          const totalPrice = item.quantity * item.price;
          
          if (categorySales.has(categoryId)) {
            const current = categorySales.get(categoryId);
            current.amount += totalPrice;
            totalSales += totalPrice;
          }
        }
      });
    });

    // Convert to array and sort by amount in descending order
    let salesData = Array.from(categorySales.values())
      .filter(item => item.amount > 0) // Only include categories with sales
      .sort((a, b) => b.amount - a.amount);

    // Take top 6 categories
    const topCategories = salesData.slice(0, 6);
    const otherCategories = salesData.slice(6);

    // Calculate totals for "Others"
    let otherAmount = otherCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const otherItems = otherCategories.map(cat => ({
      id: cat.id,
      label: cat.label,
      amount: cat.amount,
      value: totalSales > 0 ? (cat.amount / totalSales) * 100 : 0
    }));

    // Calculate percentages for top categories
    const result = topCategories.map((item, index) => ({
      id: index,
      label: item.label,
      amount: item.amount,
      value: totalSales > 0 ? (item.amount / totalSales) * 100 : 0
    }));

    // Always include "Others" even if amount is 0
    result.push({
      id: 6, // 6 because we have 0-5 for top 6 categories
      label: 'Others',
      amount: otherAmount,
      value: totalSales > 0 ? (otherAmount / totalSales) * 100 : 0,
    });

    // Round the percentages and ensure they sum to 100%
    if (result.length > 0) {
      // First, round all values to 1 decimal place
      result.forEach(item => {
        item.value = Math.round(item.value * 10) / 10;
      });

      // Calculate the sum of all values except the last one
      const sum = result.slice(0, -1).reduce((acc, item) => acc + item.value, 0);
      
      // Adjust the last item to make the total exactly 100%
      result[result.length - 1].value = Math.round((100 - sum) * 10) / 10;
    }

    res.status(200).json({
      status: true,
      message: 'Sales by category retrieved successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching sales by category:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch sales by category',
      error: error.message
    });
  }
};

export const get_top_selling_products_by_subcategory = async (req: Request, res: Response) => {
  try {
    const { limit = '5' } = req.query;
    const limitNum = parseInt(limit as string) || 5;

    // Aggregate to get top selling products by subcategory
    const topSellingProducts = await Order.aggregate([
      // Unwind the order items array
      { $unwind: "$orderItems" },
      
      // Lookup to get product details including category
      {
        $lookup: {
          from: 'products',
          localField: 'orderItems.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      
      // Lookup to get subcategory details
      {
        $lookup: {
          from: 'subcategories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'subcategory'
        }
      },
      { $unwind: '$subcategory' },
      
      // Group by subcategory and product, calculate total quantity sold
      {
        $group: {
          _id: {
            subcategoryId: '$subcategory._id',
            subcategoryName: '$subcategory.menuName',
            productId: '$productDetails._id',
            productName: '$productDetails.name',
            productImage: { $arrayElemAt: ['$productDetails.images', 0] },
            sellingPrice: '$productDetails.sellingPrice',
            actualPrice: '$productDetails.actualPrice',
            discount: {
              $cond: [
                { $gt: ['$productDetails.actualPrice', 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $subtract: ['$productDetails.actualPrice', '$productDetails.sellingPrice'] },
                            '$productDetails.actualPrice'
                          ]
                        },
                        100
                      ]
                    },
                    2
                  ]
                },
                0
              ]
            }
          },
          totalQuantitySold: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] } }
        }
      },
      
      // Sort by subcategory and total quantity sold in descending order
      { $sort: { '_id.subcategoryName': 1, totalQuantitySold: -1 } },
      
      // Group by subcategory to get top N products for each
      {
        $group: {
          _id: '$_id.subcategoryId',
          subcategoryName: { $first: '$_id.subcategoryName' },
          products: {
            $push: {
              productId: '$_id.productId',
              name: '$_id.productName',
              image: '$_id.productImage',
              sellingPrice: '$_id.sellingPrice',
              actualPrice: '$_id.actualPrice',
              discount: '$_id.discount',
              totalQuantitySold: '$totalQuantitySold',
              totalRevenue: '$totalRevenue'
            }
          }
        }
      },
      
      // Project to limit the number of products per subcategory
      {
        $project: {
          _id: 1,
          subcategoryName: 1,
          products: { $slice: ['$products', limitNum] }
        }
      },
      
      // Sort by subcategory name
      { $sort: { subcategoryName: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Top selling products by subcategory retrieved successfully',
      data: topSellingProducts
    });
    
  } catch (error: any) {
    console.error('Error fetching top selling products by subcategory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top selling products by subcategory',
      error: error.message
    });
  }
};

export const get_top_selling_products = async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string) || 10;

    // Aggregate to get top selling products
    const topSellingProducts = await Order.aggregate([
      // Unwind the order items array
      { $unwind: "$orderItems" },
      
      // Lookup to get product details
      {
        $lookup: {
          from: 'products',
          localField: 'orderItems.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      
      // Lookup to get subcategory details
      {
        $lookup: {
          from: 'subcategories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'subcategory'
        }
      },
      { $unwind: '$subcategory' },
      
      // Group by product and calculate total quantity sold and revenue
      {
        $group: {
          _id: {
            productId: '$productDetails._id',
            name: '$productDetails.name',
            image: { $arrayElemAt: ['$productDetails.images', 0] },
            sellingPrice: '$productDetails.sellingPrice',
            actualPrice: '$productDetails.actualPrice',
            subcategory: {
              id: '$subcategory._id',
              name: '$subcategory.menuName'
            }
          },
          totalQuantitySold: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] } },
          orderCount: { $sum: 1 }
        }
      },
      
      // Calculate discount percentage
      {
        $addFields: {
          discount: {
            $cond: [
              { $gt: ['$_id.actualPrice', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ['$_id.actualPrice', '$_id.sellingPrice'] },
                          '$_id.actualPrice'
                        ]
                      },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          }
        }
      },
      
      // Sort by total quantity sold in descending order
      { $sort: { totalQuantitySold: -1 } },
      
      // Limit the number of results
      { $limit: limitNum },
      
      // Project to format the output
      {
        $project: {
          _id: 0,
          productId: '$_id.productId',
          name: '$_id.name',
          image: '$_id.image',
          sellingPrice: '$_id.sellingPrice',
          actualPrice: '$_id.actualPrice',
          discount: 1,
          subcategory: '$_id.subcategory',
          totalQuantitySold: 1,
          totalRevenue: 1,
          orderCount: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Top selling products retrieved successfully',
      data: topSellingProducts
    });
    
  } catch (error: any) {
    console.error('Error fetching top selling products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top selling products',
      error: error.message
    });
  }
};