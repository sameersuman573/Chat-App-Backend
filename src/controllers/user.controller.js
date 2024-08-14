import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { ApiError } from "../utils/apiError.utils.js";
import { uploadfile } from "../utils/cloudinary.utils.js";

const GenerateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);

    if (!user) {
      throw new ApiError(400, "User not found");
    }

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();

    // Now as the tokens are refreshed so save the refresh token in the database

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(400, "failed to generate the access and refresh token");
  }
};

const register = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  // you are getting avatar from the req.files not from the req.body

  if (![username, email, fullname, password].every((feild) => feild?.trim())) {
    throw new ApiError(400, "Please fill all the fields");
  }

  const sameuser = await User.findOne({ $or: [{ email }] });

  if (sameuser) {
    throw new ApiError(400, "User already exists");
  }

  const avatarLocalPath = req.file?.path;

  // console.log('req.file:', req.file);

  if (!req.file) {
    console.log("No files found in the request.");
  } else if (!avatarLocalPath) {
    console.log("Avatar file does not have a valid path.");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload the avatar");
  }

  let avatarUrl;

  try {
    avatarUrl = await uploadfile(avatarLocalPath);
  } catch (error) {
    if (avatarUrl && avatarUrl.public_id) {
      await deleteUploadedFile(avatarUrl.public_id); // Implemented delete logic as per Cloudinary API
    }
    throw new ApiError(400, "Failed to upload the avatar");
  }

  try {
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      password,
      fullname,
      avatar: avatarUrl.url,
    });

    const createduser = await User.findById(user._id).select(
      "-password -refreshToken",
    );

    if (!createduser) {
      throw new ApiError(400, "User not found");
    }

    const {accessToken , refreshToken} = await GenerateAccessAndRefreshToken(createduser._id);
    
    const options = {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    };


    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }); // 7 days for refresh token



    return res
      .status(201)
      .json(new ApiResponse(201, {
        createduser,
        accessToken,
        refreshToken
      } ,"User registered successfully"));
  } catch (error) {
    throw new ApiError(400, "Failed to register user", error);
  }
});

const deleteUploadedFile = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
    // console.log(`Deleted file: ${public_id}`);
  } catch (error) {
    throw new ApiError(400, "Failed to delete the uploaded file");
  }
};

const Login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      throw new ApiError(
        400,
        "Please fill the fields of username and password",
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(400, "The user doesnot exists");
    }

    // Match the password

    const MatchPassword = await user.IspasswordCorrect(password);

    if (!MatchPassword) {
      throw new ApiError(400, "The password is incorrect");
    }

    // Fetch the access and refresh token
    const { accessToken, refreshToken } = await GenerateAccessAndRefreshToken(
      user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken",
    );

    // console.log(loggedInUser);

    const options = {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    };

    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }); // 7 days for refresh token

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully",
      ),
    );
  } catch (error) {
    throw new ApiError(400, "Failed to login user");
  }
});

const GetCurrentUser = asyncHandler(async (req, res) => {
  // console.log('Authenticated User:', req.user);

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken",
  );

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User found successfully"));
});

const Logout = asyncHandler(async (req, res) => {
  const user = req.user._id;

  const finduser = await User.findByIdAndUpdate(
    user,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const Incomingtoken =
      req.cookies?.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "") ||
      req.body?.refreshToken;

    if (!Incomingtoken) {
      throw new ApiError(400, "No token FOund");
    }

    const decodedToken = jwt.verify(
      Incomingtoken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(400, "User not found");
    }

    // Matching the incoming token with the token stored in the database
    if (Incomingtoken !== user.refreshToken) {
      throw new ApiError(400, "Token doesnot match in database");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await GenerateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newrefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token refreshed successfully",
        ),
      );
  } catch (error) {
    throw new ApiError(400, "Failed to refresh the access token");
  }
});

export { register, Login, GetCurrentUser, Logout, refreshAccessToken };
