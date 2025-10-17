import { Request, Response } from "express";
import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";
import Mainmenu from "../models/mainMenus.model";
import { console } from "inspector";
import { uploadToS3 } from "../utils/aws";

const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const add_category = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { menuName, mainmenuId } = req.body;
    const file = req.file;
    // Step 1: Create main menu (optional)
    const categorySlug = generateSlug(menuName);
    const category = await Category.findOne({
      menuName: menuName,
      slug: categorySlug,
    });
    if (category) {
      return res
        .status(400)
        .json({ message: "Menu already exists", status: false });
    }
    let imageUrl = "";
    if (file) {
      try {
        imageUrl = await uploadToS3(file.buffer, file.mimetype, "categories");
      } catch (uploadError) {
        console.error("Error uploading to S3:", uploadError);
        return res.status(500).json({
          message: "Error uploading image",
          status: false,
          error: uploadError,
        });
      }
    }
    const newCategory = new Category({
      menuName: menuName,
      slug: categorySlug,
      mainmenuId: mainmenuId,
      icon: imageUrl || undefined,
    });
    await newCategory.save();

    return res.status(201).json({
      message: "Category structure created successfully",
      status: true,
      data: newCategory,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", status: false, error });
  }
};

export const add_subcategory = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { menuName, menuId } = req.body;
    const file = req.file;
    // Step 1: Create main menu (optional)
    const subcategorySlug = generateSlug(menuName);
    const subcategory = await Subcategory.findOne({
      menuName: menuName,
      slug: subcategorySlug,
    });
    if (subcategory) {
      return res
        .status(400)
        .json({ message: "Menu already exists", status: false });
    }
    let imageUrl = "";
    if (file) {
      try {
        imageUrl = await uploadToS3(file.buffer, file.mimetype, "categories");
      } catch (uploadError) {
        console.error("Error uploading to S3:", uploadError);
        return res.status(500).json({
          message: "Error uploading image",
          status: false,
          error: uploadError,
        });
      }
    }
    const newSubcategory = new Subcategory({
      menuName: menuName,
      slug: subcategorySlug,
      menuId: menuId,
      icon: imageUrl || undefined,
    });
    await newSubcategory.save();

    return res.status(201).json({
      message: "Subcategory structure created successfully",
      status: true,
      data: newSubcategory,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", status: false, error });
  }
};

export const get_categories = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const mainMenus = await Mainmenu.find()
      .select("-createdAt -updatedAt -__v")
      .lean();
    const menus = await Category.find()
      .select("-createdAt -updatedAt -__v")
      .lean();
    const submenus = await Subcategory.find()
      .select("-createdAt -updatedAt -__v")
      .lean();
    const structuredData = mainMenus.map((main) => {
      const menusUnderMain = menus
        .filter((menu) => menu.mainmenuId?.toString() === main._id.toString())
        .map((menu) => {
          const subMenusForMenu = submenus.filter(
            (sub) => sub.menuId?.toString() === menu._id.toString()
          );

          return {
            ...menu,
            subMenus: subMenusForMenu,
          };
        });

      return {
        ...main,
        menus: menusUnderMain,
      };
    });

    return res.status(200).json({
      message: "Category structure fetched successfully",
      status: true,
      data: structuredData,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", status: false, error });
  }
};

export const get_menu_by_id = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { menuId } = req.params;
    if (!menuId) {
      return res.status(400).json({
        message: "ID is required",
        status: false,
      });
    }

    // Try to find mainMenu by id
    const mainMenu = await Mainmenu.findById(menuId)
      .select("-createdAt -updatedAt -__v")
      .lean();

    if (mainMenu) {
      // If mainMenu found, fetch menus and submenus nested inside
      const menus = await Category.find({ mainmenuId: menuId })
        .select("-createdAt -updatedAt -__v")
        .lean();

      const submenuIds = menus.map((m) => m._id.toString());
      const submenus = await Subcategory.find({ menuId: { $in: submenuIds } })
        .select("-createdAt -updatedAt -__v")
        .lean();

      const menusWithSubmenus = menus.map((menu) => ({
        ...menu,
        subMenus: submenus.filter(
          (sub) => sub.menuId?.toString() === menu._id.toString()
        ),
      }));

      return res.status(200).json({
        message: "Main menu data fetched successfully",
        status: true,
        data: {
          ...mainMenu,
          menus: menusWithSubmenus,
        },
      });
    }

    // Try to find menu by id
    const menu = await Category.findById(menuId)
      .select("-createdAt -updatedAt -__v")
      .lean();

    if (menu) {
      // Fetch parent mainMenu
      const parentMainMenu = await Mainmenu.findById(menu.mainmenuId)
        .select("-createdAt -updatedAt -__v")
        .lean();

      // Fetch submenus for this menu
      const submenus = await Subcategory.find({ menuId: menuId })
        .select("-createdAt -updatedAt -__v")
        .lean();

      return res.status(200).json({
        message: "Menu data fetched successfully",
        status: true,
        data: {
          ...menu,
          subMenus: submenus,
          mainMenu: parentMainMenu || null,
        },
      });
    }

    // Try to find submenu by id
    const submenu = await Subcategory.findById(menuId)
      .select("-createdAt -updatedAt -__v")
      .lean();

    if (submenu) {
      // Fetch parent menu
      const parentMenu = await Category.findById(submenu.menuId)
        .select("-createdAt -updatedAt -__v")
        .lean();

      // Fetch grandparent mainMenu
      let parentMainMenu = null;
      if (parentMenu?.mainmenuId) {
        parentMainMenu = await Mainmenu.findById(parentMenu.mainmenuId)
          .select("-createdAt -updatedAt -__v")
          .lean();
      }

      return res.status(200).json({
        message: "Submenu data fetched successfully",
        status: true,
        data: {
          ...submenu,
          menu: parentMenu || null,
          mainMenu: parentMainMenu || null,
        },
      });
    }

    // If none found
    return res.status(404).json({
      message: "No menu, submenu, or mainMenu found with this ID",
      status: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
      status: false,
      error,
    });
  }
};
export const get_subcategories_by_id = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId)
      .populate("mainmenuId")
      .select("menuName mainmenuId");
    const subcategories = await Subcategory.find({ menuId: categoryId }).select(
      "-createdAt -updatedAt -__v"
    );
    return res.status(200).send({
      message: "Subcategories fetched successfully",
      status: true,
      data: subcategories,
      category: category,
    });
  } catch (error) {
    console.log("Error in get_subcategories_by_id:", error);
    return res.status(500).send({
      message: "Server error",
      status: false,
      error: error instanceof Error ? error.message : error,
    });
  }
};
export const update_section = async (req: Request, res: Response) => {
  try {
    const { sections } = req.body;
    const file = req.file;
    for (const section of sections) {
      const { menuName, itemIndex, _id } = section;
      const slug = generateSlug(menuName);
      if (!menuName || !slug) {
        return res
          .status(400)
          .json({ status: false, message: "Menu name and slug are required." });
      }
      await Mainmenu.findOneAndUpdate(
        { _id: _id },
        {
          menuName: menuName,
          slug: slug,
          itemIndex: itemIndex,
          icon: file
            ? await uploadToS3(file.buffer, file.mimetype, "categories")
            : undefined,
        }
      );
    }
    return res.status(200).json({
      status: true,
      message: "Section updated successfully.",
      data: sections,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ status: false, message: "Server error." });
  }
};
// Update category by ID
export const update_category = async (req: Request, res: Response) => {
  try {
    const { category } = req.body;
    const file = req.file;
    for (const section of category) {
      const { menuName, itemIndex, _id } = section;
      const slug = generateSlug(menuName);
      if (!menuName || !slug) {
        return res
          .status(400)
          .json({ status: false, message: "Menu name and slug are required." });
      }
      await Category.findOneAndUpdate(
        { _id: _id },
        {
          menuName: menuName,
          slug: slug,
          itemIndex: itemIndex,
          icon: file
            ? await uploadToS3(file.buffer, file.mimetype, "categories")
            : undefined,
        }
      );
    }
    return res.status(200).json({
      status: true,
      message: "Section updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ status: false, message: "Server error." });
  }
};

export const update_subcategory = async (req: Request, res: Response) => {
  try {
    const { subCategories } = req.body;
    const file = req.file;
    for (const section of subCategories) {
      const { menuName, itemIndex, _id } = section;
      const slug = generateSlug(menuName);
      if (!menuName || !slug) {
        return res
          .status(400)
          .json({ status: false, message: "Menu name and slug are required." });
      }
      await Subcategory.findOneAndUpdate(
        { _id: _id },
        {
          menuName: menuName,
          slug: slug,
          itemIndex: itemIndex,
          icon: file
            ? await uploadToS3(file.buffer, file.mimetype, "categories")
            : undefined,
        }
      );
    }
    return res.status(200).json({
      status: true,
      message: "Section updated successfully.",
      data: subCategories,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ status: false, message: "Server error." });
  }
};

export const updateMenus = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.body;
    const menu = await Category.findById(menuId);
    if (!menu) {
      return res.status(404).json({
        status: false,
        message: "Menu not found",
      });
    }
    let iconUrl = "";
    if (
      req.files &&
      (req.files as unknown as Express.Multer.File[]).length > 0
    ) {
      const file = req.files as unknown as Express.Multer.File[];
      const uploadResults = await uploadToS3(
        file[0].buffer,
        file[0].mimetype,
        "banners"
      );
      iconUrl = uploadResults; // Take the first uploaded image URL
    }
    const menuData = await Category.findOneAndUpdate(
      { _id: menuId },
      {
        menuName: menu.menuName,
        slug: menu.slug,
        itemIndex: menu.itemIndex,
        icon: iconUrl,
      }, {new: true}
    );
    return res.status(200).json({
      status: true,
      message: "Section updated successfully.",
      data: menuData,
    });
  } catch (error) {}
};
