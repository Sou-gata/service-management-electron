import express from "express";
import {
    getCompanies,
    createCompany,
    updateCompany
} from "../controller/company.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken as any);

router.get("/", getCompanies);
router.post("/", isAdmin as any, createCompany);
router.put("/:id", isAdmin as any, updateCompany);

export default router;
