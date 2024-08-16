import { Router } from "express";
import { verifyJWT } from "../middlewares/Auth.middleware.js";
 import { GetBalance, Transfer , TransactionProfile } from "../controllers/Account.controller.js";


const router = Router();

router.route("/balance").get(verifyJWT , GetBalance)
router.route("/transfer").post(verifyJWT , Transfer)


// Aggregation Pipelines
router.route("/history/:Fromusername").get(verifyJWT, TransactionProfile);


export default router