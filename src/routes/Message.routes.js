import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {zodValidation} from "../middlewares/ZodValidate.middleware.js"
 import { Chat } from "../models/Chat.model.js";
 import{ verifyJWT  } from "../middlewares/Auth.middleware.js"
import { SendMessage , getAllMessages , DeleteMessage, SendAttachmentOnly} from "../controllers/message.controller.js";



const router = Router();



router.route("/send/:chatId").post(upload.single("Attachments") , verifyJWT , SendMessage)
router.route("/GetMessage/:chatId").get(verifyJWT , getAllMessages)
router.route("/DeleteMessage/:chatId/:messageId").post(verifyJWT , DeleteMessage)
router.route("/sendAttachment/:chatId").post(upload.single("Attachments") , verifyJWT , SendAttachmentOnly)


export default router;
