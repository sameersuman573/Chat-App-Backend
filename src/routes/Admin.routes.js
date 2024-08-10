import { Router } from "express";
import {
  GetallChats,
  GetallMessages,
  GetallUsers,
  GetDashboardStats,
  adminLogin,
  adminLogout,
  getAdminData
} from "../controllers/Admin.controller.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";
import { AdminOnly } from "../middlewares/Auth.middleware.js";

const router = Router();

router.route("/LoginAdmin").post(adminLogin);
router.route("/LogoutAdmin").post(AdminOnly, adminLogout);

router.route("/GetAdmin").get(AdminOnly, getAdminData);

router.route("/GetallChats").get(AdminOnly, GetallChats);
router.route("/GetallMessages").get(AdminOnly, GetallMessages);
router.route("/GetallUsers").get(AdminOnly, GetallUsers);

router.route("/GetStats").get(AdminOnly, GetDashboardStats);

export default router;
