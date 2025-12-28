import mongoose from "mongoose";

export interface IUser {
  _id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "manager" | "user";
  emailVerified?: Date;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "user"],
      default: "user",
    },
    emailVerified: {
      type: Date,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
// Note: email index is automatically created due to unique: true
userSchema.index({ role: 1 });
userSchema.index({ name: 1 }); // Add name index for search

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
