import { Router } from "express";
import { register , Login, GetCurrentUser, Logout} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {zodValidation} from "../middlewares/ZodValidate.middleware.js"
import {userSchemaValidation} from "../models/User.model.js"
import { verifyJWT } from "../middlewares/Auth.middleware.js";



const router = Router();

router.route("/register").post(upload.single("avatar"), register);
router.route("/login").post(Login)
router.route("/Currentuser").get(verifyJWT,GetCurrentUser )
router.route("/logout").post(verifyJWT,Logout)
export default router;
