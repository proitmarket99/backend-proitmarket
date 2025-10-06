import { Request, Response } from "express";
import { uploadToS3, deleteFile } from "../utils/aws";
import Banner from "../models/banners.model";

export const add_banner = async (req: Request, res: Response) => {
  try {
    const { offerName, productId } = req.body;
    if (!offerName?.toString().trim() && !productId?.toString().trim()) {
      return res.status(400).json({
        status: false,
        message: 'Either Offer Name or Product ID is required'
      });
    }

    // If files are uploaded, process them
    let bannerImageUrl = '';
    if (req.files && (req.files as unknown as Express.Multer.File[]).length > 0) {
      const file = req.files as unknown as Express.Multer.File[];
      const uploadResults = await uploadToS3(file[0].buffer, file[0].mimetype, "banners");
      bannerImageUrl = uploadResults; // Take the first uploaded image URL
    }

    // Create a new banner
    const banner = await Banner.create({
      offerName: offerName || null,
      productId: productId || null,
      banners: bannerImageUrl
    });

    return res.status(201).json({
      status: true,
      message: "Banner created successfully",
      data: banner
    });
  } catch (error:any) {
    console.error("Error in add_banner:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to create banner",
      error: error.message
    });
  }
};

export const get_banners = async (req: Request, res: Response) => {
  try {
    const banners = await Banner.find().populate("offerName").populate("productId");
    return res
      .status(201)
      .send({ status:true,message: "Banners fetched successfully", data:banners });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ message: "Failed to fetch banners", error });
  }
};

export const delete_image_from_banner = async (req: Request, res: Response) => {
  try {
    const { bannerId } = req.params;
    
    if (!bannerId) {
      return res.status(400).json({
        status: false,
        message: "Banner ID is required"
      });
    }

    const banner = await Banner.findById(bannerId);
    
    if (!banner) {
      return res.status(404).json({
        status: false,
        message: "Banner not found"
      });
    }

    // Delete the image from R2 if it exists
    if (banner.banners) {
     const response =  await deleteFile(banner.banners);
     if(response){
      await Banner.findByIdAndDelete(bannerId);
     }
      
    }

    return res.status(200).json({
      status: true,
      message: "Banner image deleted successfully"
    });
  } catch (error:any) {
    console.error("Error in delete_image_from_banner:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to delete banner image",
      error: error.message
    });
  }
};

export const edit_banner = async (req: Request, res: Response)=>{
  try {
    const {bannerId,banners,offerName,productId, status} = req.body;
    const banner = await Banner.findOne({_id:bannerId});
    if(!banner){
      return res.status(404).json({
        status:false,
        message:"Banner not found"
      })
    }
    if(banners){
      banner.banners = banners;
    }
    if(offerName){
      banner.offerName = offerName;
    }
    if(productId){
      banner.productId = productId;
    }
    if(status===true || status===false){
      banner.status = status;
    }
    await banner.save();
    return res.status(200).json({
      status:true,
      message:"Banner updated successfully",
      data:banner
    })
  } catch (error:any) {
    console.error("Error in edit_banner:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to edit banner",
      error: error.message
    });
  }
}