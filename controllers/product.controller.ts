import { Request, Response } from "express";
import { uploadToS3, deleteFile } from "../utils/aws";
import mongoose, { Types } from "mongoose";
import Product from "../models/product.model";
import Subcategory from "../models/subcategory.model";
import Category from "../models/category.model"; // Import Category model
import Mainmenu from "../models/mainMenus.model";
import Offer from "../models/offer.modal";
import path from "path";
import axios from "axios";
import https from "https";
import mime from "mime-types";
import { google } from "googleapis";
import stream from "stream";
import { promisify } from "util";

const agent = new https.Agent({ family: 4 });
const pipeline = promisify(stream.pipeline);

interface BulkProductData {
  name: string;
  headerName: string;
  brand: string;
  modelNumber?: string;
  sku: string;
  category: string;
  section: string;
  subcategory: string;
  description: string;
  imageLinks: string;
  actualPrice: number;
  sellingPrice: number;
  itemCode: string;
  stock: number;
  warranty?: string;
  manufacturingDate?: string;
  pluCode: string;
  weight?: string;
  size?: string;
  specifications?: Array<{
    section: string;
    specs: Array<{ label: string; value: string }>;
  }>;
}

/**
 * Downloads images from Google Drive and uploads them to S3
 * @param imageLinks Array of Google Drive image links
 * @returns Array of S3 URLs
 */

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../service-account.json"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

const extractFolderId = (url: string): string | null => {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};
export const downloadAndUploadImages = async (folderUrl: string) => {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) {
    console.error("Invalid folder URL");
    return;
  }

  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id, name, mimeType)",
  });

  const files = listRes.data.files || [];
  if (!files.length) {
    console.log("No images found in the folder.");
    return;
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    try {
      const downloadRes = await drive.files.get(
        { fileId: file.id!, alt: "media" },
        { responseType: "stream" }
      );

      const chunks: Uint8Array[] = [];
      await pipeline(
        downloadRes.data,
        new stream.Writable({
          write(chunk, _, callback) {
            chunks.push(chunk);
            callback();
          },
        })
      );

      const fileBuffer = Buffer.concat(chunks);
      const mimeType = file.mimeType || mime.lookup(file.name!) || "image/jpeg";

      // Upload to S3
      const s3Url = await uploadToS3(
        fileBuffer,
        mimeType.toString(),
        "products"
      );
      if (s3Url) {
        uploadedUrls.push(s3Url);
      }
    } catch (err: any) {
      console.error(`Failed to process file ${file.name}:`, err.message);
    }
  }

  return uploadedUrls;
};

// Function to extract file ID from Google Drive link
const extractFileId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};
const getDirectDownloadURL = (fileId: string) =>
  `https://drive.google.com/uc?export=download&id=${fileId}`;
const processGoogleDriveImages = async (
  imageLinks: string
): Promise<string> => {
  const fileId = extractFileId(imageLinks);
  if (!fileId) {
    return "";
  }

  const directURL = getDirectDownloadURL(fileId);
  const filename = `image_${Date.now()}.jpg`;

  const response = await axios.get(directURL, {
    responseType: "arraybuffer",
    timeout: 15000,
    httpsAgent: agent,
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const buffer = Buffer.from(response.data, "binary");
  const mimetype = mime.lookup(filename) || "image/jpeg";

  // Upload to S3
  const s3Url = await uploadToS3(buffer, mimetype, "products");
  if (s3Url) {
    return s3Url;
  }
  return "";
};

export const upload_to_s3 = async (req: Request, res: Response)=>{
  try {
    const files = req.files as Express.Multer.File[];
    const fileExtension = files[0].mimetype.split('/')[1] || 'bin';
    const fileName = `${"products"}/${Date.now().toString()}.${fileExtension}`;
    const s3Url = await uploadToS3(files[0].buffer,files[0].mimetype,fileName);if(s3Url){
      return res.status(200).json({ message: "Banner uploaded successfully", data:s3Url });
    }
    
    return res.status(200).json({ message: "Banner uploaded failed", data:"" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
export const add_product = async (req: Request, res: Response) => {
  try {
    const {
      name,
      headerName,
      brand,
      modelNumber,
      sku,
      category,
      description,
      sellingPrice,
      actualPrice,
      stock,
      warranty,
      manufacturingDate,
      weight,
      size,
      specifications,
      driveLink,
      isActive,
      isBestSeller,
      isDailyOffer,
      isInStock,
    } = req.body;

    const files = req.files as Express.Multer.File[];

    // Calculate discount percentage
    const discountPercentage = Math.round(
      ((actualPrice - sellingPrice) / actualPrice) * 100
    );

    // Upload all images to S3
    const images = await Promise.all(
      files.map(async (file) => {
        return await uploadToS3(file.buffer, file.mimetype, "products");
      })
    );
    if (driveLink) {
      const image = await processGoogleDriveImages(driveLink);
      if (image) {
        images.push(...image);
      }
    }
    const product = new Product({
      name,
      headerName,
      vendorId: req.user,
      brand,
      modelNumber,
      sku,
      category,
      description,
      discount: discountPercentage,
      images,
      actualPrice,
      sellingPrice,
      stock,
      warranty,
      manufacturingDate,
      weight,
      size,
      specifications: specifications ? JSON.parse(specifications) : {},
      isActive,
      isInStock,
    });

    await product.save();
    if (isBestSeller) {
      await Offer.findOneAndUpdate(
        {
          type: "bestSeller",
        },
        {
          $push: { products: product._id },
        },
        {
          upsert: true,
        }
      );
    }
    if (isDailyOffer) {
      await Offer.findOneAndUpdate(
        {
          type: "dailyOffer",
        },
        {
          $push: { products: product._id },
        },
        {
          upsert: true,
        }
      );
    }
    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const edit_product = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const product = JSON.parse(req.body.productData);
    //const newProductImages = JSON.parse(req.body.newProductImages);
    const discountPercentage = Math.round(
      ((product.actualPrice - product.sellingPrice) / product.actualPrice) * 100
    );
    const productData = await Product.findOne({
      _id: product._id,
      vendorId: userId,
    });
    if (!productData) {
      return res
        .status(404)
        .json({ message: "You are not authorized to edit this product" });
    }
    let productImages = productData?.images;
    const toDeleteImages = JSON.parse(req.body.toDeleteImages);
    if (toDeleteImages && toDeleteImages.length > 0) {
      await Promise.all(
        toDeleteImages.map(async (file: string) => {
          return await deleteFile(file);
        })
      ).then(() => {
        productImages = productImages?.filter(
          (item: string) => !toDeleteImages.includes(item)
        );
      });
    }
    let images: any[] | undefined = [];
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      images = await Promise.all(
        files.map(async (file) => {
          return await uploadToS3(file.buffer, file.mimetype, "products");
        })
      );
    }
    if (product.driveLink) {
      const image = await processGoogleDriveImages(product.driveLink);
      if (image) {
        images.push(...image);
      }
    }
    const updatedImages = productImages
      ? [...productImages, ...images]
      : [...images];

    const response = await Product.findOneAndUpdate(
      { _id: product._id },
      {
        name: product.name,
        headerName: product.headerName,
        specifications: product.specifications,
        discount: discountPercentage,
        images: updatedImages,
        section: product.section._id,
        category: product.category._id,
        subcategory: product.subcategory._id,
        brand: product.brand,
        modelNumber: product.modelNumber,
        sku: product.sku,
        warranty: product.warranty,
        manufacturingDate: product.manufacturingDate,
        weight: product.weight,
        size: product.size,
        isActive: product.isActive,
        pluCode: product.pluCode,
        actualPrice: product.actualPrice,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        discountPercentage: discountPercentage,
        description:product.description,
        isInStock: product.isInStock,
        // isBestSeller: product.isBestSeller,
        // isDailyOffer: product.isDailyOffer,
      }
    );
    if (product.isBestSeller) {
      await Offer.findOneAndUpdate(
        {
          type: "bestSeller",
        },
        {
          $pull: { products: product._id },
        },
        {
          upsert: true,
        }
      );
    }
    if (product.isDailyOffer) {
      await Offer.findOneAndUpdate(
        {
          type: "dailyOffer",
        },
        {
          $pull: { products: product._id },
        },
        {
          upsert: true,
        }
      );
    }
    return res.status(201).send({ status: true, data: response, message: "" });
  } catch (err: any) {
    console.log(err);
    return res.status(500).send({ status: false, message: err.message });
  }
};

export const get_products = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const products = await Product.find()
      .populate("category")
      .select("-createdAt -updatedAt -__v")
      .lean();
    return res.status(201).send({ message: "", status: true, data: products });
  } catch (err: any) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

export const get_product_by_id = async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ _id: req.params.id })
      .populate("section")
      .populate("category")
      .populate("subcategory")
      .select("-createdAt -updatedAt -__v");
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.status(200).send({ message: "", status: true, data: product });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const get_products_by_query = async (req: Request, res: Response) => {
  try {
    const {
      id,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      search,
      sort = "newest",
      page = "1",
      limit = "10",
    } = req.query as Record<string, any>;
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

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      query.category = new mongoose.Types.ObjectId(category);
    }
    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      query.subcategory = new mongoose.Types.ObjectId(subcategory);
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
        { 'specifications.value': regex },
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
  } catch (error) {
    console.error("Error getting products:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};
export const getFilters = async (req: Request, res: Response) => {
  try {
    const { section, category, subcategory } = req.query;
    
    // Build match stage based on query parameters
    const matchStage: any = {};
    
    if (section) {
      matchStage.section = new mongoose.Types.ObjectId(section as string);
    }
    
    if (category) {
      matchStage.category = new mongoose.Types.ObjectId(category as string);
    }
    
    if (subcategory) {
      matchStage.subcategory = new mongoose.Types.ObjectId(subcategory as string);
    }
    const filters = await Product.aggregate([
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      {
        $facet: {
          brand: [{ $group: { _id: "$brand" } }],
          processor: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Processor And Memory Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Processor Name" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          generation: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Processor And Memory Features",
              },
            },
            { $unwind: "$specifications.specs" },
            {
              $match: { "specifications.specs.label": "Processor Generation" },
            },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          ram: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Processor And Memory Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "RAM" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          storageType: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Processor And Memory Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Storage Type" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          ssdCapacity: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Processor And Memory Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "SSD Capacity" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          screenSize: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Display And Audio Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Screen Size" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          resolution: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Display And Audio Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Screen Resolution" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          os: [
            { $unwind: "$specifications" },
            { $match: { "specifications.section": "Operating System" } },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Operating System" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          color: [
            { $unwind: "$specifications" },
            { $match: { "specifications.section": "General" } },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Color" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          graphics: [
            { $unwind: "$specifications" },
            {
              $match: {
                "specifications.section": "Processor And Memory Features",
              },
            },
            { $unwind: "$specifications.specs" },
            { $match: { "specifications.specs.label": "Graphic Processor" } },
            { $group: { _id: "$specifications.specs.value" } },
          ],
          price: [
            {
              $project: {
                priceRange: {
                  $switch: {
                    branches: [
                      {
                        case: { $lt: ["$sellingPrice", 2000] },
                        then: "< 2000",
                      },
                      {
                        case: {
                          $and: [
                            { $gte: ["$sellingPrice", 2000] },
                            { $lte: ["$sellingPrice", 2500] },
                          ],
                        },
                        then: "2000 - 2500",
                      },
                      {
                        case: { $gt: ["$sellingPrice", 2500] },
                        then: "> 2500",
                      },
                    ],
                    default: "Unknown",
                  },
                },
              },
            },
            { $group: { _id: "$priceRange" } },
          ],
        },
      },
    ]);

    const format = (arr: any[]) => arr.map((item: any) => item._id);

    const result = {
      brand: format(filters[0].brand),
      processor: format(filters[0].processor),
      generation: format(filters[0].generation),
      ram: format(filters[0].ram),
      storageType: format(filters[0].storageType),
      ssdCapacity: format(filters[0].ssdCapacity),
      screenSize: format(filters[0].screenSize),
      resolution: format(filters[0].resolution),
      os: format(filters[0].os),
      color: format(filters[0].color),
      graphics: format(filters[0].graphics),
      price: format(filters[0].price),
    };

    res.status(200).json({
      status: true,
      message: "Filters generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error generating filters:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

export const getProductsByMainMenu = async (req: Request, res: Response) => {
  try {
    const { mainMenuId } = req.params;
    const {
      brand,
      minPrice,
      maxPrice,
      search,
      sort = "newest",
      page = "1",
      limit = "10",
      ...filters
    } = req.query as Record<string, any>;
    // Step 1: Find all menus under the main menu
    const menus = await Category.find({ mainmenuId: mainMenuId }).select(
      "_id menuName slug"
    );

    // Step 2: Build product query with filters
    const query: any = {
      section: mainMenuId, // mandatory filter by main menu
    };

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
        { "specifications.value": regex },
      ];
    }

    Object.keys(filters).forEach((key) => {
      if (!filters[key]) return;
    
      const value = filters[key];
      
      if (Array.isArray(value)) {
        // For array values (multiple selections)
        query[`specifications.specs.value`] = { $in: value };
      } else {
        // For single value
        query[`specifications.specs.value`] = value;
      }
    });
    // Step 3: Sorting
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
    const products = await Product.find(query)
      .populate("category")
      .select("-__v -createdAt -updatedAt")
      .sort(sortBy)

    // Step 5: Group products by menu
    const menuMap = new Map();

    menus.forEach((menu) => {
      menuMap.set(menu._id.toString(), {
        menuName: menu.menuName,
        slug: menu.slug,
        _id: menu._id,
        products: [],
      });
    });

    products.forEach((product) => {
      const submenu = product.category as unknown as {
        _id: string | Types.ObjectId;
        slug: string;
        menuName: string;
      };
      const submenuId = submenu?._id?.toString();
      if (menuMap.has(submenuId)) {
        menuMap.get(submenuId)?.products.push(product);
      }
    });

    const result = Array.from(menuMap.values());

    return res.status(200).send({
      message: "",
      status: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching products by main menu:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const {
      brand,
      minPrice,
      maxPrice,
      search,
      sort = "newest",
      page = "1",
      limit = "10",
      ...filters
    } = req.query as Record<string, any>;
    const subCategories = await Subcategory.find({ menuId: categoryId }).select(
      "_id menuName slug"
    );
     const query: any = {
      category: categoryId, // mandatory filter by main menu
    };

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
        { "specifications.value": regex },
      ];
    }

    Object.keys(filters).forEach((key) => {
      if (!filters[key]) return;
    
      const value = filters[key];
      
      if (Array.isArray(value)) {
        // For array values (multiple selections)
        query[`specifications.specs.value`] = { $in: value };
      } else {
        // For single value
        query[`specifications.specs.value`] = value;
      }
    });
    // Step 3: Sorting
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
    const products = await Product.find(query)
      .populate("subcategory")
      .sort(sortBy);
    const categoryMap = new Map();

    subCategories.forEach((subCategory) => {
      categoryMap.set(subCategory._id.toString(), {
        menuName: subCategory.menuName,
        slug: subCategory.slug,
        _id: subCategory._id,
        products: [],
      });
    });

    products.forEach((product) => {
      const submenu = product.subcategory as unknown as {
        _id: string | Types.ObjectId;
        slug: string;
        menuName: string;
      };
      const submenuId = submenu?._id?.toString();
      if (categoryMap?.has(submenuId)) {
        categoryMap?.get(submenuId)?.products?.push(product);
      }
    });

    const result = Array.from(categoryMap.values());
    return res.status(200).send({
      message: "",
      status: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const change_status = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { productId } = req.params;
    // First get the current product to check its current status
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .send({ status: false, message: "Product not found" });
    }

    // Toggle the isActive status
    product.isActive = !product.isActive;
    await product.save();

    return res.status(200).send({
      status: true,
      message: `Product ${
        product.isActive ? "activated" : "deactivated"
      } successfully`,
      isActive: product.isActive,
    });
  } catch (err: any) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

export const change_stock_status = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { productId } = req.params;
    // First get the current product to check its current status
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .send({ status: false, message: "Product not found" });
    }

    // Toggle the isActive status
    product.isInStock = !product.isInStock;
    await product.save();

    return res.status(200).send({
      status: true,
      message: `Product ${
        product.isInStock ? "activated" : "deactivated"
      } successfully`,
      isActive: product.isInStock,
    });
  } catch (err: any) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

// Mark a product as best-seller
export const markAsBestSeller = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { isBestSeller } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { isBestSeller },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: `Product ${
        isBestSeller ? "marked as" : "removed from"
      } best seller`,
      product,
    });
  } catch (error) {
    console.error("Error updating best seller status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Create/update a daily offer
export const createDailyOffer = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { expiryHours = 24 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + Number(expiryHours));

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        isDailyOffer: true,
        dailyOfferExpiry: expiryDate,
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Daily offer created successfully",
      product,
    });
  } catch (error) {
    console.error("Error creating daily offer:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get best-selling products
export const getBestSellingProducts = async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;
    const limitNum = Math.min(Number(limit) || 10, 100);

    const products = await Product.find({
      isActive: true,
      isBestSeller: true,
    })
      .sort({ salesCount: -1 })
      .limit(limitNum);

    return res.status(200).send({
      message: "Best selling products retrieved successfully",
      status: true,
      data: products,
    });
  } catch (error) {
    console.error("Error getting best selling products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get active daily offers
export const getDailyOffers = async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;
    const limitNum = Math.min(Number(limit) || 10, 100);

    const products = await Product.find({
      isActive: true,
      isDailyOffer: true,
      //dailyOfferExpiry: { $gt: new Date() },
    })
      .sort({ discountPercentage: -1 })
      .limit(limitNum);

    return res.status(200).send({
      message: "Daily offers retrieved successfully",
      status: true,
      data: products,
    });
  } catch (error) {
    console.error("Error getting daily offers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get products with discounts
export const getDiscountedProducts = async (req: Request, res: Response) => {
  try {
    const { minDiscount = "10", limit = "10" } = req.query;
    const minDiscountNum = Math.max(Number(minDiscount) || 10, 0);
    const limitNum = Math.min(Number(limit) || 10, 100);

    // Using aggregation to calculate discount percentage and filter
    const products = await Product.aggregate([
      {
        $match: {
          isActive: true,
          actualPrice: { $gt: 0 },
        },
      },
      {
        $addFields: {
          discountPercentage: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ["$actualPrice", "$sellingPrice"] },
                  "$actualPrice",
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $match: {
          discountPercentage: { $gte: minDiscountNum },
        },
      },
      { $sort: { discountPercentage: -1 } },
      { $limit: limitNum },
    ]);

    return res.status(200).json({
      message: "Discounted products retrieved successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error getting discounted products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to check for duplicate products
const checkForDuplicateProduct = async (
  name: string,
  pluCode: string,
  modelNumber?: string
) => {
  const error = [];
  const conditions: any = [
    { name: { $regex: new RegExp(`^${name}$`, "i") } }, // Case-insensitive exact match
    { pluCode: { $regex: new RegExp(`^${pluCode}$`, "i") } },
  ];

  if (modelNumber) {
    conditions.push({
      modelNumber: { $regex: new RegExp(`^${modelNumber}$`, "i") },
    });
  }

  const existingProduct = await Product.findOne({
    $or: conditions,
  });

  if (existingProduct) {
    if (existingProduct.name.toLowerCase() === name.toLowerCase()) {
      error.push("Name already exists");
    }
    if (
      existingProduct.pluCode &&
      existingProduct.pluCode.toLowerCase() === pluCode.toLowerCase()
    ) {
      error.push("PLU Code already exists");
    }
    if (
      existingProduct.modelNumber &&
      modelNumber &&
      existingProduct.modelNumber.toLowerCase() === modelNumber.toLowerCase()
    ) {
      error.push("Model Number already exists");
    }
  }
  return error;
};

export const check_duplicate = async (req: Request, res: Response) => {
  try {
    const productsData: BulkProductData[] = req.body;
    const duplicateChecks = await Promise.all(
      productsData.map(async (productData) => {
        const errors = await checkForDuplicateProduct(
          productData.name,
          productData.pluCode,
          productData.modelNumber
        );
        return {
          item: productData,
          errors,
        };
      })
    );

    const duplicateProducts = duplicateChecks.filter(
      (item) => item.errors.length > 0
    );
   if(duplicateProducts.length > 0){
    return res.status(200).send({
      status: false,
      message: "Duplicate check completed successfully",
      data: duplicateProducts,
    });
   }
    return res.status(200).send({
      status: true,
      message: "Duplicate check completed successfully",
      data: duplicateProducts,
    });
  } catch (error: any) {
    console.error("Error checking duplicate product:", error);
    return res.status(500).send({
      status: false,
      message: "An error occurred while checking for duplicates",
      error: error.message,
    });
  }
};
export const bulk_import = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const productsData: BulkProductData[] = req.body;
    if (!Array.isArray(productsData) || productsData.length === 0) {
      return res.status(400).send({
        status: false,
        message: "Products array is required and cannot be empty",
      });
    }

    // Process each product
    const results = await Promise.allSettled(
      productsData.map(async (productData) => {
        const result: any = {
          //sku: productData.sku,
          success: false,
          productId: null,
          message: "",
          errors: [],
        };

        try {
          // Validate required fields
          const requiredFields = [
            "name",
            "brand",
            "modelNumber",
            "category",
            "description",
            "actualPrice",
            "sellingPrice",
            "pluCode",
          ];
          const missingFields = requiredFields.filter(
            (field) => !productData[field as keyof typeof productData]
          );

          if (missingFields.length > 0) {
            throw new Error(
              `Missing required fields: ${missingFields.join(", ")}`
            );
          }

          // Check for duplicates
          const duplicateCheck = await checkForDuplicateProduct(
            productData.name,
            productData.pluCode,
            productData.modelNumber || ""
          );

          if (duplicateCheck.length > 0) {
            throw new Error(`Duplicate ${duplicateCheck} found`);
          }

          // Process images
          const section = await Mainmenu.findOne({
            menuName: productData.section,
          });
          // Find category by name or slug
          if (!section) {
            throw new Error(`Section '${productData.section}' not found`);
          }
          const category = await Category.findOne({
            mainmenuId: section._id,
            menuName: productData.category,
          });

          if (!category) {
            throw new Error(`Category '${productData.category}' not found`);
          }
          const subcategory = await Subcategory.findOne({
            menuId: category._id,
            menuName: productData.subcategory,
          });
          if (!subcategory) {
            throw new Error(
              `Subcategory '${productData.subcategory}' not found`
            );
          }
          const discountPercentage = Math.round(
            ((productData.actualPrice - productData.sellingPrice) /
              productData.actualPrice) *
              100
          );
          let imageUrls: string[] = [];
          if (productData.imageLinks) {
            try {
              const uploadedImages = await downloadAndUploadImages(
                productData.imageLinks
              );
              if (uploadedImages && uploadedImages.length > 0) {
                imageUrls = uploadedImages;
              }
            } catch (error: any) {
              console.error("Error processing images:", error);
              throw new Error(`Image processing failed: ${error.message}`);
            }
          }
          // Create new product
          const newProduct = new Product({
            name: productData.name,
            headerName: productData.headerName,
            pluCode: productData.pluCode,
            vendorId: userId,
            brand: productData.brand,
            modelNumber: productData.modelNumber || "",
            //sku: productData.sku,
            category: category._id,
            section: section._id,
            discount: discountPercentage,
            subcategory: subcategory._id,
            specifications: productData.specifications,
            description: productData.description,
            images: imageUrls,
            actualPrice: productData.actualPrice,
            sellingPrice: productData.sellingPrice,
            stock: productData.stock || 0,
            warranty: productData.warranty,
            manufacturingDate: productData.manufacturingDate
              ? new Date(productData.manufacturingDate)
              : undefined,
            weight: productData.weight,
            size: productData.size,
            isActive: true,
            isInStock: true,
            discountPercentage,
          });

          const savedProduct = await newProduct.save({ session });

          result.success = true;
          result.productId = savedProduct._id;
          result.message = "Product created successfully";
        } catch (error: any) {
          result.success = false;
          result.message = error.message || "Failed to create product";
          result.errors = error.errors
            ? Object.values(error.errors).map((e: any) => e.message)
            : [];

          // Log the error for debugging
          console.error(`Error creating product ${productData.sku}:`, error);
        }

        return result;
      })
    );

    // Check if any operations failed
    const hasFailures = results.some(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success)
    );

    if (hasFailures) {
      await session.abortTransaction();
    } else {
      await session.commitTransaction();
    }

    // Process results
    const processedResults = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : {
            success: false,
            message: r.reason?.message || "Unknown error",
            errors: r.reason?.errors || [],
          }
    );

    const successCount = processedResults.filter((r) => r.success).length;
    const failedCount = processedResults.length - successCount;

    return res.status(hasFailures ? 207 : 200).json({
      status: !hasFailures,
      message: `Bulk import completed. Success: ${successCount}, Failed: ${failedCount}`,
      data: processedResults,
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Bulk import error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during bulk import",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const save_images = async (req: Request, res: Response) => {
  try {
    await downloadAndUploadImages(req.body.imageLinks);
    return res
      .status(200)
      .send({ status: true, message: "Images saved", data: {} });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during bulk import",
      error: error.message,
    });
  }
};
