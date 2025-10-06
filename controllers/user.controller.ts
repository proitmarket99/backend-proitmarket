import { Request, Response } from "express";
import userModel, { IUser } from "../models/user.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user.model";

interface UserPayload {
  userId: string | unknown;
  email: string;
  userType: "user" | "vendor";
}

const generateToken = (id: string, role: string): string => {
  const secretKey = process.env.JWT_SECRET_KEY || "your-secret-key";
  return jwt.sign({ userId: id, role }, secretKey, { expiresIn: "30d" });
};
export const signup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const reqUser: IUser | null = await userModel.findOne({ email });

    if (reqUser) {
      return res.status(200).send({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user: IUser = new userModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    user.save();
    if (user) {

      const token = generateToken(user._id.toString(), "user");

      return res.status(201).send({
        status: true,
        data: { user: user, token: token },
        message: "Signup successful",
      });
    }

    return res.status(400).send({ error: "User could not be created" });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;
    const userData: IUser | null = (await userModel.findOne({
      email,
    })) as IUser | null;
    if (!userData) {
      return res.status(404).send({ message: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, userData.password);
    if (!validPassword) {
      return res.status(400).send({ message: "Invalid Password" });
    }

    const token = generateToken(userData._id.toString(), "user");

    return res.status(201).send({
      status: true,
      data: { user: userData, token: token, type: "user" },
      message: "Login Successful",
    });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const get_user = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req?.user?.id;
    const user = await User.findOne({ _id: userId });
    return res.status(200).send({ message: "", status: true, data: user });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const update_user = async (req: Request, res: Response) => {
  try {
    const userId = req?.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ message: "User not found" });

    const { firstName, lastName, addresses, email } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;

    if (addresses) {
      // If no _id is provided, add as a new address
      user.addresses.push(addresses);
    }

    await user.save();
    return res.status(200).send({
      message: "User updated successfully",
      status: true,
      data: user,
    });
  } catch (err: any) {
    console.error("Error updating user:", err);
    return res.status(500).send({
      message: "Error updating user",
      error: err.message,
    });
  }
};

export const update_user_password = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ message: "User not found" });
    const { password } = req.body;
    user.password = password;
    await user.save();
    return res.status(200).send({ message: "", status: true, data: user });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const update_user_address = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ message: "User not found" });
    const { addresses } = req.body;
    if (addresses && addresses._id) {
      // Find the index of the address to update
      const addressIndex = user.addresses.findIndex(
        (addr) => addr._id.toString() === addresses._id
      );

      if (addressIndex === -1) {
        return res.status(404).send({ message: "Address not found" });
      }

      // Update the address fields
      user.addresses[addressIndex] = {
        ...user.addresses[addressIndex],
        ...addresses,
        _id: user.addresses[addressIndex]._id, // Preserve the original _id
      };
    }
    await user.save();
    return res.status(200).send({ message: "", status: true, data: user });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const get_users = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    return res.status(200).send({ message: "", status: true, data: users });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const get_user_by_id = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ message: "User not found" });
    return res.status(200).send({ message: "", status: true, data: user });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};

export const change_password = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    const user = await userModel.findOne({ email: email });
    if (!user) return res.status(404).send({ message: "User not found" });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();
    return res
      .status(200)
      .send({
        message: "Password changed successfully",
        status: true,
        data: user,
      });
  } catch (err: any) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
};
