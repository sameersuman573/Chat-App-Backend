import { v2 as cloudinary } from "cloudinary";
import exp from "constants";
import fs, { unlink } from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Algorithm - To upload the file

// Use try and catch

// Check if the file exists
// If yes do the upload functionality
// check if the file uploaded or not if yes , then do unlink the file
// if not write in catch block the again check file and unlink it

const uploadfile = async (localfilepath) => {
  try {
    if (!localfilepath) {
      console.log("The file path doenot exists");
    }

    const res = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "raw",
    });

    console.log("file is uploaded successfull ", res.url);
    

    if (fs.existsSync(localfilepath)) {
      fs.unlinkSync(localfilepath);
      console.log("The file is unlink successfully", localfilepath);
    } else {
      console.log("file not found");
    }

    return res;
  } catch (error) {
    console.log("There is an error uploading the file ", error);

    if (fs.existsSync(localfilepath)) {
      fs.unlinkSync(localfilepath);
      console.log("The file is unlinked Successfully", localfilepath);
    }

    throw new Error("Failed to upload the file");
  }
};

export { uploadfile };
