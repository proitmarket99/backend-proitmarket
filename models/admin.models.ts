import mongoose, { Document, Schema, ObjectId } from "mongoose";

export interface IAdmin extends Document {
  _id: ObjectId;
   email: string;
   password: string;
}
const adminSchema = new Schema<IAdmin>({
  email: {type:String},
  password: {type:String}
})

const Admin = mongoose.model<IAdmin>("admin", adminSchema);

export default Admin;