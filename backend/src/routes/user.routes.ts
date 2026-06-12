import express from "express";
import {
    login,
    register,
    me,
    getAllUsers,
    updateUser,
    deleteUser,
    changePassword,
} from "../controller/user.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", verifyToken as any, isAdmin as any, register);
router.get("/me", verifyToken as any, me);
router.get("/", verifyToken as any, isAdmin as any, getAllUsers);
router.put("/:id", verifyToken as any, isAdmin as any, updateUser);
router.delete("/:id", verifyToken as any, isAdmin as any, deleteUser);
router.put("/:id/password", verifyToken as any, isAdmin as any, changePassword);

export default router;

