import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { zodValidation } from "../middlewares/ZodValidate.middleware.js";
import { Chat } from "../models/Chat.model.js";
import {
  AddMembersToGroup,
  AssignAdmin,
  CreateorGetAOneoneChat,
  DeleteGroupChat,
  DeleteOneonOneChat,
  GetGroupChatsDetails,
  GetMyALLChats,
  GetMyAllGroups,
  LeaveGroupChat,
  RemoveMembersFromGroup,
  RenameGroupChat,
  createAGroupChat,
  searchAvailiableUser,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

// router.route("/register").post(upload.single("avatar"), zodValidation(userSchemaValidation)  , register);
router.route("/Group").post(verifyJWT, createAGroupChat);
router.route("/Mychats").get(verifyJWT, GetMyALLChats);
router.route("/Search").get(verifyJWT, searchAvailiableUser);
router.route("/Onechat").post(verifyJWT, CreateorGetAOneoneChat);
router.route("/Chatdetails/:chatId").get(verifyJWT, GetGroupChatsDetails);
router.route("/DeleteGroup/:chatId").post(verifyJWT, DeleteGroupChat);
// router.route("/DeleteOneonOne/:chatId").post(verifyJWT, DeleteOneonOneChat);
router.route("/LeaveGroup/:chatId").post(verifyJWT, LeaveGroupChat);
router.route("/RenameGroup/:chatId").post(verifyJWT, RenameGroupChat);

router.route("/Mygroupchats").get(verifyJWT, GetMyAllGroups);

router
  .route("/AddMembers")
  .post(verifyJWT, AddMembersToGroup);

router
  .route("/RemoveMembers")
  .post(verifyJWT, RemoveMembersFromGroup);

router.route("/AssignAdmin/:chatId/:memberId").post(verifyJWT, AssignAdmin);

export default router;
