import { Router } from "express";
import { verifyJWT } from "../middlewares/Auth.middleware.js";
import {
  SendNotif,
  AcceptConnection,
  RejectConnection,
  GetMyAllNotif,
  GetmyFriends,
} from "../controllers/Notif.controller.js";

const router = Router();

// router.route("/send/:chatId").post(upload.single("Attachments") , verifyJWT , SendMessage)
// router.route("/GetMessage/:chatId").get(verifyJWT , getAllMessages)
// router.route("/DeleteMessage/:chatId/:messageId").post(verifyJWT , DeleteMessage)

router.route("/sendnotif").post(verifyJWT , SendNotif);

router.route("/accept/:notifId").post(verifyJWT , AcceptConnection);
router.route("/reject/:notifId").post(verifyJWT , RejectConnection);

router.route("/getmynotif").get(verifyJWT , GetMyAllNotif);
router.route("/getmyfriends").get(verifyJWT , GetmyFriends);

export default router;
