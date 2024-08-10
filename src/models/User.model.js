import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"
import mongoose, { Schema } from "mongoose";
import { z } from "zod";

export const userSchemaValidation = z.object({
  username: z.string().min(5).max(10),
  email: z.string().email(),
  fullname: z.string().min(5).max(50),
  password: z.string().min(5).max(50),
   });

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      // select:false
      // when querying the user, password will not be shown
    },

    avatar: {
      type: String,
      // required: true,
    },


    refreshToken: {
      type: String,
    },
  },
  { timestamps: true },
);

// Encrypting the Password

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Decrypting the Password

// Creating a Method based on Schema

userSchema.methods.IspasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Creating a Access Token

userSchema.methods.createAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
      avatar: this.avatar,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

// Creating a Refresh Token

userSchema.methods.createRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};


export const User = mongoose.model("User", userSchema);