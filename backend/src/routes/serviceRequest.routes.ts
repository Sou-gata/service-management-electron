import express from "express";
import {
    createServiceRequest,
    getServiceRequests,
    getServiceRequestById,
    updateServiceRequest,
    updateServiceRequestStatus,
    deleteServiceRequest,
    getServiceRequestStats,
    downloadServiceRequestPdf,
    uploadImage,
    sendForServicing,
    getCustomerByMobile,
} from "../controller/serviceRequest.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(verifyToken as any);

router.post("/upload", upload.single("image"), uploadImage);
router.post("/", createServiceRequest);
router.get("/", getServiceRequests);
router.get("/stats", getServiceRequestStats);
router.get("/customer/:mobile", getCustomerByMobile);
router.get("/:id", getServiceRequestById);
router.get("/:id/pdf", downloadServiceRequestPdf);
router.put("/:id", isAdmin as any, updateServiceRequest);
router.patch("/:id/status", isAdmin as any, updateServiceRequestStatus);
router.post("/:id/send-servicing", isAdmin as any, sendForServicing);
router.delete("/:id", isAdmin as any, deleteServiceRequest);

export default router;
