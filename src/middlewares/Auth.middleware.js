// This middleware will verify based on JWT tokesn is the user Exist on not
// The middleare algorithm
// 1.extract the token from cookies or with the Authorization header
// 2. verifies it and then checks if the user associated with the token exists or not in the database
// Note - In the Jwt token we have saved the ID also

import { ApiError } from "../utils/apiError.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { adminSecretKey } from "../app.js";
// Design you own Miidleware

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // console.log("Cookies:", req.cookies);
    // console.log("Headers:", req.headers);
    const token =
      (await req.cookies?.accessToken) ||
      req.header("Authorization")?.replace("Bearer ", "");
    // console.log("Cookies:", req.cookies);
    // console.log("Headers:", req.headers);
    // console.log("Extracted token:", token);

    if (!token) {
      throw new ApiError(401, "Unauthorized requests");
    }

    const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // console.log("Decoded token:", decodedtoken);

    const user = await User.findById(decodedtoken._id).select(
      "-password -refreshToken",
    );

    // console.log("Retrieved user:", user);

    if (!user) {
      throw new ApiError(401, "invalid access token for user");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, " Unathorized - Invalid Access tokens");
  }
});

export const AdminOnly = (req, res, next) => {

  const token = req.cookies["chattu-admin-token"];

  if (!token) {
    throw new ApiError(401, "Only admin can Access this Route");
  }

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);

  const isMatch = secretKey === adminSecretKey;

  if(!isMatch){
    throw new ApiError(401 , "only Admin can Access You are not Allowed")
  }

  next()
};
