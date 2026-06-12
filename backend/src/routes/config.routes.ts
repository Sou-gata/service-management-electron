import express from "express";
import {
    getDeviceTypes,
    createDeviceType,
    updateDeviceType,
    deleteDeviceType,
    getAccessories,
    createAccessory,
    updateAccessory,
    deleteAccessory
} from "../controller/config.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken as any);

router.get("/device-types", getDeviceTypes);
router.post("/device-types", isAdmin as any, createDeviceType);
router.put("/device-types/:id", isAdmin as any, updateDeviceType);
router.delete("/device-types/:id", isAdmin as any, deleteDeviceType);

router.get("/accessories", getAccessories);
router.post("/accessories", isAdmin as any, createAccessory);
router.put("/accessories/:id", isAdmin as any, updateAccessory);
router.delete("/accessories/:id", isAdmin as any, deleteAccessory);

export default router;
