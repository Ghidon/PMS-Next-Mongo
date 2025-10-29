// models/User.ts
import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  type Types,
} from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    image: { type: String },
    role: { type: String, enum: ["ADMIN", "MEMBER"], default: "MEMBER" },
    password: { type: String }, // set for credentials users
    provider: { type: String, enum: ["credentials", "google"], default: "credentials" },
    googleId: { type: String },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

type UserSchemaType = InferSchemaType<typeof userSchema>;
export type User = UserSchemaType & { _id: Types.ObjectId };

const UserModel: Model<User> =
  (models.User as Model<User>) || model<User>("User", userSchema, "users");

export default UserModel;
