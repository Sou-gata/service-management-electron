import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Eye,
    X,
    Laptop,
    Check,
    Loader2,
    Calendar as CalendarIcon,
    User,
    Layers,
    Upload,
    Send,
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import PaginationTable from "../components/PaginationTable";
import type { Column } from "../components/PaginationTable";
import baseURL from "../utils/baseURL";
import { ServiceDetailsDialog } from "../components/ServiceDetailsDialog";
import { CompleteConfirmDialog } from "../components/CompleteConfirmDialog";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ServiceItem {
    id?: number;
    item_name: string;
    item_description?: string;
    sent_for_servicing?: number | boolean;
    servicing_problem_description?: string;
    is_warranty?: number | boolean;
}

interface ServiceRequest {
    id: number;
    customer_name: string;
    customer_mobile: string;
    customer_address: string;
    device_type: string;
    brand_model: string;
    serial_number: string | null;
    problem_description: string | null;
    status: string;
    registered_by_user: string | null;
    items_count: number;
    created_at: string;
    updated_at: string;
    items?: ServiceItem[];
    product_image?: string | null;
    dispatch_date?: string | null;
    servicing_company_id?: number | null;
    challan_no?: string | null;
    courier_details?: string | null;
    is_solved?: number | boolean | null;
    is_sent_for_servicing?: number | null;
}

const COMMON_ITEMS = [
    "Charger",
    "Laptop Bag",
    "Mouse",
    "Power Cable",
    "Battery",
    "HDMI Cable",
    "Keyboard",
];

const STATUS_OPTIONS = [
    {
        value: "Received",
        label: "Received",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
    },
    {
        value: "Servicing",
        label: "Servicing",
        color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400",
    },
    {
        value: "Completed",
        label: "Completed",
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    {
        value: "Delivered",
        label: "Delivered",
        color: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-400",
    },
];

const DEFAULT_DEVICE_TYPES = [
    "Laptop",
    "Desktop",
    "All-in-One",
    "MacBook",
    "iMac",
    "Tablet",
    "Other",
];

const Services: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user?.role === "admin";
    // Lists and state
    const [data, setData] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"active" | "delivered">(
        location.pathname.includes("delivered") ? "delivered" : "active"
    );
    const [filters, setFilters] = useState({
        search: "",
        statusFilter: "",
    });

    // Dynamic device types & accessories (loaded from database API)
    const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
    const [accessories, setAccessories] = useState<string[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);

    // Combined modals state
    const [modals, setModals] = useState({
        register: false,
        edit: false,
        details: false,
        otherCategory: false,
        saveConfirmation: false,
        delivery: false,
        sendServicing: false,
        completeConfirm: false,
    });

    const [completeIsSolved, setCompleteIsSolved] = useState<boolean>(true);

    const setModalOpen = (key: keyof typeof modals, isOpen: boolean) => {
        setModals((prev) => ({ ...prev, [key]: isOpen }));
    };

    // Servicing details state
    const [servicingState, setServicingState] = useState<{
        requestId: number | null;
        dispatchDate: string;
        companyId: string;
        challanNo: string;
        courierDetails: string;
        items: Array<{
            id: number;
            item_name: string;
            item_description: string;
            sent_for_servicing: boolean;
            servicing_problem_description: string;
        }>;
    }>({
        requestId: null,
        dispatchDate: format(new Date(), "yyyy-MM-dd"),
        companyId: "",
        challanNo: "",
        courierDetails: "",
        items: [],
    });

    // Dialog state for entering new custom category
    const [customCategory, setCustomCategory] = useState<{
        input: string;
        pendingType: string;
        targetIdx: number | null;
    }>({
        input: "",
        pendingType: "",
        targetIdx: null,
    });

    // Action loading states
    const [actionLoading, setActionLoading] = useState({
        submitting: false,
        submittingDelivery: false,
        downloadingPdf: false,
    });

    // Delivery Details Modal State
    const [deliveryState, setDeliveryState] = useState<{
        requestId: number | null;
        previousStatus: string;
        cost: string;
        isSolved: boolean;
        returnedItems: string[];
        newParts: Array<{
            name: string;
            serial: string;
            brand: string;
            cost: string;
        }>;
        intakeItems: ServiceItem[];
        isEditModalSource: boolean;
    }>({
        requestId: null,
        previousStatus: "",
        cost: "",
        isSolved: true,
        returnedItems: [],
        newParts: [],
        intakeItems: [],
        isEditModalSource: false,
    });

    const handleDeviceTypeChange = (val: string) => {
        if (val === "Other") {
            setCustomCategory((prev) => ({ ...prev, targetIdx: null }));
            setModalOpen("otherCategory", true);
        } else {
            setForm((prev) => ({ ...prev, deviceType: val }));
        }
    };

    const handleSaveCustomType = (persist: boolean) => {
        if (!customCategory.pendingType.trim()) return;

        const cleanVal = customCategory.pendingType.trim();
        const matchedType = deviceTypes.find(
            (type) => type.toLowerCase() === cleanVal.toLowerCase()
        );

        if (!matchedType) {
            const updated = [...deviceTypes];
            const otherIndex = updated.indexOf("Other");
            if (otherIndex !== -1) {
                updated.splice(otherIndex, 0, cleanVal);
            } else {
                updated.push(cleanVal);
            }
            setDeviceTypes(updated);

            if (persist) {
                apiService
                    .post("/api/v1/config/device-types", { name: cleanVal })
                    .then(() => {
                        toaster(
                            "success",
                            `Category "${cleanVal}" saved for future!`
                        );
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to save category to database:",
                            err
                        );
                        toaster(
                            "warning",
                            `Category "${cleanVal}" selected, but failed to save to database.`
                        );
                    });
            } else {
                toaster(
                    "success",
                    `Category "${cleanVal}" set for current intake.`
                );
            }

            if (customCategory.targetIdx !== null) {
                const updatedDevs = [...formDevices];
                if (updatedDevs[customCategory.targetIdx]) {
                    updatedDevs[customCategory.targetIdx].device_type =
                        cleanVal;
                }
                setFormDevices(updatedDevs);
            } else {
                setForm((prev) => ({ ...prev, deviceType: cleanVal }));
            }
        } else {
            if (customCategory.targetIdx !== null) {
                const updatedDevs = [...formDevices];
                if (updatedDevs[customCategory.targetIdx]) {
                    updatedDevs[customCategory.targetIdx].device_type =
                        matchedType;
                }
                setFormDevices(updatedDevs);
            } else {
                setForm((prev) => ({ ...prev, deviceType: matchedType }));
            }
            toaster(
                "info",
                `Category "${matchedType}" already exists, selected it.`
            );
        }

        setModalOpen("saveConfirmation", false);
        setCustomCategory({ input: "", pendingType: "", targetIdx: null });
    };

    const fetchConfigData = async () => {
        try {
            const [typesRes, accRes, compRes] = await Promise.all([
                apiService.get("/api/v1/config/device-types"),
                apiService.get("/api/v1/config/accessories"),
                apiService.get("/api/v1/companies"),
            ]);

            const types = (typesRes.data || typesRes).map((t: any) => t.name);
            const filteredTypes = types.filter((t: string) => t !== "Other");
            filteredTypes.push("Other");

            const accs = (accRes.data || accRes).map((a: any) => a.name);

            setDeviceTypes(filteredTypes);
            setAccessories(accs);
            setCompanies(compRes.data || compRes);
        } catch (error: any) {
            console.error(
                "Failed to fetch database configuration options:",
                error
            );
            setDeviceTypes(DEFAULT_DEVICE_TYPES);
            setAccessories(COMMON_ITEMS);
        }
    };

    useEffect(() => {
        fetchConfigData();
    }, []);

    useEffect(() => {
        if (location.pathname.includes("delivered")) {
            setActiveTab("delivered");
        } else {
            setActiveTab("active");
        }

        // Handle ?new=true deep-link to open register modal
        const params = new URLSearchParams(location.search);
        if (params.get("new") === "true") {
            setModalOpen("register", true);
            navigate(
                { pathname: location.pathname, search: "" },
                { replace: true }
            );
        }
    }, [location.pathname]);

    // Pagination / Sorting state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        sortBy: "created_at",
        sortOrder: "desc" as "asc" | "desc",
    });

    // Active Request state
    const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(
        null
    );

    // Form states combined into a single object
    const [form, setForm] = useState({
        customerName: "",
        customerMobile: "",
        customerAddress: "",
        deviceType: "Laptop",
        brandModel: "",
        serialNumber: "",
        problemDesc: "",
        estimatedDeliveryDate: "",
        estimatedCost: "",
        status: "Received",
        items: [] as ServiceItem[],
        productImage: "",
        isWarranty: false,
    });

    // Quick-add item states combined
    const [customItem, setCustomItem] = useState({
        name: "",
        desc: "",
    });

    const [formDevices, setFormDevices] = useState<
        Array<{
            device_type: string;
            brand_model: string;
            serial_number: string;
            problem_description: string;
            estimated_delivery_date: string;
            estimated_cost: string;
            items: ServiceItem[];
            tempAccName: string;
            tempAccDesc: string;
            product_image?: string;
            is_warranty?: boolean;
        }>
    >([
        {
            device_type: "Laptop",
            brand_model: "",
            serial_number: "",
            problem_description: "",
            estimated_delivery_date: "",
            estimated_cost: "",
            items: [],
            tempAccName: "",
            tempAccDesc: "",
            product_image: "",
            is_warranty: false,
        },
    ]);

    const [searchingMobile, setSearchingMobile] = useState(false);

    const handleSearchCustomerByMobile = async () => {
        if (!form.customerMobile || !form.customerMobile.trim()) {
            toaster("warning", "Please enter a mobile number to search.");
            return;
        }
        setSearchingMobile(true);
        try {
            const response = await apiService.get(
                `/api/v1/service-requests/customer/${form.customerMobile.trim()}`
            );
            const customer = response.data || response;
            if (customer && customer.customer_name) {
                setForm((prev) => ({
                    ...prev,
                    customerName: customer.customer_name,
                    customerAddress: customer.customer_address || "",
                }));
                toaster(
                    "success",
                    "Customer details retrieved and auto-populated!"
                );
            } else {
                toaster(
                    "warning",
                    "No past records found for this mobile number."
                );
            }
        } catch (error: any) {
            console.error("Error searching customer by mobile:", error);
            toaster("warning", "No past records found for this mobile number.");
        } finally {
            setSearchingMobile(false);
        }
    };

    const handleDeviceTypeChangeForReg = (devIdx: number, val: string) => {
        if (val === "Other") {
            setCustomCategory((prev) => ({ ...prev, targetIdx: devIdx }));
            setModalOpen("otherCategory", true);
        } else {
            const updated = [...formDevices];
            updated[devIdx].device_type = val;
            setFormDevices(updated);
        }
    };

    const handleAddDeviceField = () => {
        setFormDevices([
            ...formDevices,
            {
                device_type: "Laptop",
                brand_model: "",
                serial_number: "",
                problem_description: "",
                estimated_delivery_date: "",
                estimated_cost: "",
                items: [],
                tempAccName: "",
                tempAccDesc: "",
                is_warranty: false,
            },
        ]);
    };

    const handleRemoveDeviceField = (index: number) => {
        if (formDevices.length <= 1) return;
        setFormDevices(formDevices.filter((_, idx) => idx !== index));
    };

    const handleToggleRegDeviceCommonItem = (
        devIdx: number,
        itemName: string
    ) => {
        const updated = [...formDevices];
        const dev = updated[devIdx];
        const isSelected = dev.items.some((i) => i.item_name === itemName);

        if (isSelected) {
            dev.items = dev.items.filter((i) => i.item_name !== itemName);
        } else {
            dev.items.push({ item_name: itemName, item_description: "" });
        }
        setFormDevices(updated);
    };

    const handleAddRegDeviceCustomItem = (devIdx: number) => {
        const updated = [...formDevices];
        const dev = updated[devIdx];
        if (!dev.tempAccName || !dev.tempAccName.trim()) return;

        dev.items.push({
            item_name: dev.tempAccName.trim(),
            item_description: dev.tempAccDesc
                ? dev.tempAccDesc.trim()
                : undefined,
        });
        dev.tempAccName = "";
        dev.tempAccDesc = "";
        setFormDevices(updated);
    };

    const handleRemoveRegDeviceItem = (devIdx: number, itemIdx: number) => {
        const updated = [...formDevices];
        updated[devIdx].items = updated[devIdx].items.filter(
            (_, idx) => idx !== itemIdx
        );
        setFormDevices(updated);
    };

    const handleUpdateRegDeviceItemDesc = (
        devIdx: number,
        itemIdx: number,
        desc: string
    ) => {
        const updated = [...formDevices];
        updated[devIdx].items[itemIdx].item_description = desc;
        setFormDevices(updated);
    };

    const handleUpdateRegDeviceItemWarranty = (
        devIdx: number,
        itemIdx: number,
        isWarranty: boolean
    ) => {
        const updated = [...formDevices];
        updated[devIdx].items[itemIdx].is_warranty = isWarranty;
        setFormDevices(updated);
    };

    // Load service requests
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const statusParam =
                activeTab === "delivered"
                    ? "Delivered"
                    : filters.statusFilter || "active";

            const response = await apiService.get("/api/v1/service-requests", {
                params: {
                    search: filters.search,
                    status: statusParam,
                    page: pagination.currentPage,
                    limit: pagination.rowsPerPage,
                    sortBy: pagination.sortBy,
                    sortOrder: pagination.sortOrder,
                },
            });
            const resData = response.data || response;
            setData(resData.serviceRequests || []);
            setPagination((prev) => ({
                ...prev,
                totalPages: resData.pagination?.totalPages || 1,
            }));
        } catch (error: any) {
            console.error("Failed to load registrations:", error);
            toaster(
                "error",
                error.response?.data?.message || "Failed to load registrations."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append("image", file);
        try {
            const response = await apiService.post(
                "/api/v1/service-requests/upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            const filename = response.filename || response.data?.filename;
            if (!filename) throw new Error("Filename not returned");
            return filename;
        } catch (error: any) {
            console.error("Failed to upload image:", error);
            toaster("error", "Failed to upload product image.");
            return null;
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [
        pagination.currentPage,
        pagination.rowsPerPage,
        pagination.sortBy,
        pagination.sortOrder,
        filters.statusFilter,
        activeTab,
    ]);

    // Handle live search with debouncing
    useEffect(() => {
        const handler = setTimeout(() => {
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
            fetchRequests();
        }, 400);

        return () => clearTimeout(handler);
    }, [filters.search]);

    // Fetch full details for a request (including items)
    const fetchRequestDetails = async (id: number) => {
        try {
            const response = await apiService.get(
                `/api/v1/service-requests/${id}`
            );
            return response.data || response;
        } catch (error: any) {
            console.error("Failed to fetch request details:", error);
            toaster("error", "Failed to retrieve intake details.");
            return null;
        }
    };

    // Open modals
    const handleOpenDetails = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            setActiveRequest(details);
            setModalOpen("details", true);
        }
    };

    const handleOpenSendServicing = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            setActiveRequest(details);
            setServicingState({
                requestId: reqId,
                dispatchDate:
                    details.dispatch_date || format(new Date(), "yyyy-MM-dd"),
                companyId: details.servicing_company_id
                    ? String(details.servicing_company_id)
                    : "",
                challanNo: details.challan_no || "",
                courierDetails: details.courier_details || "",
                items: (details.items || []).map((item: any) => ({
                    id: item.id,
                    item_name: item.item_name,
                    item_description: item.item_description || "",
                    sent_for_servicing:
                        item.sent_for_servicing === 1 ||
                        item.sent_for_servicing === true,
                    servicing_problem_description:
                        item.servicing_problem_description || "",
                })),
            });
            setModalOpen("sendServicing", true);
        }
    };

    const handleSendServicingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!servicingState.requestId) return;
        if (!servicingState.dispatchDate) {
            toaster("error", "Dispatch date is required.");
            return;
        }
        if (!servicingState.companyId) {
            toaster("error", "Please select a company.");
            return;
        }

        setActionLoading((prev) => ({ ...prev, submitting: true }));
        try {
            await apiService.post(
                `/api/v1/service-requests/${servicingState.requestId}/send-servicing`,
                {
                    dispatch_date: servicingState.dispatchDate,
                    servicing_company_id: parseInt(servicingState.companyId),
                    challan_no: servicingState.challanNo,
                    courier_details: servicingState.courierDetails,
                    items: servicingState.items.map((item) => ({
                        id: item.id,
                        sent_for_servicing: item.sent_for_servicing ? 1 : 0,
                        servicing_problem_description:
                            item.servicing_problem_description,
                    })),
                }
            );

            toaster("success", "Sent for servicing successfully!");
            setModalOpen("sendServicing", false);
            fetchRequests();
        } catch (error: any) {
            const msg =
                error.response?.data?.message ||
                "Failed to send for servicing.";
            toaster("error", msg);
        } finally {
            setActionLoading((prev) => ({ ...prev, submitting: false }));
        }
    };

    const handleOpenEdit = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            setActiveRequest(details);
            setForm({
                customerName: details.customer_name,
                customerMobile: details.customer_mobile,
                customerAddress: details.customer_address,
                deviceType: details.device_type,
                brandModel: details.brand_model,
                serialNumber: details.serial_number || "",
                problemDesc: details.problem_description || "",
                estimatedDeliveryDate: details.estimated_delivery_date || "",
                estimatedCost:
                    details.estimated_cost !== null &&
                    details.estimated_cost !== undefined
                        ? String(details.estimated_cost)
                        : "",
                status: details.status,
                items: details.items || [],
                productImage: details.product_image || "",
                isWarranty:
                    details.is_warranty === 1 || details.is_warranty === true,
            });
            setModalOpen("edit", true);
        }
    };

    // Intake Item Form Handlers
    const handleToggleCommonItem = (itemName: string) => {
        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                { item_name: itemName, item_description: "" },
            ],
        }));
    };

    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customItem.name.trim()) return;

        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    item_name: customItem.name.trim(),
                    item_description: customItem.desc.trim() || undefined,
                },
            ],
        }));
        setCustomItem({ name: "", desc: "" });
    };

    const handleRemoveItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleUpdateItemDescription = (index: number, desc: string) => {
        setForm((prev) => {
            const updated = [...prev.items];
            updated[index].item_description = desc;
            return { ...prev, items: updated };
        });
    };

    const handleUpdateItemWarranty = (index: number, isWarranty: boolean) => {
        setForm((prev) => {
            const updated = [...prev.items];
            updated[index].is_warranty = isWarranty;
            return { ...prev, items: updated };
        });
    };

    // Submit actions
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !form.customerName.trim() ||
            !form.customerMobile.trim() ||
            !form.customerAddress.trim()
        ) {
            toaster("error", "Customer details are required.");
            return;
        }

        // Validate devices
        for (let i = 0; i < formDevices.length; i++) {
            const dev = formDevices[i];
            const label = formDevices.length > 1 ? ` for Device #${i + 1}` : "";
            if (!dev.brand_model.trim()) {
                toaster("error", `Brand/Model is required${label}.`);
                return;
            }
        }

        setActionLoading((prev) => ({ ...prev, submitting: true }));
        try {
            // Map formDevices to payload structure
            const payloadDevices = formDevices.map((d) => ({
                device_type: d.device_type,
                brand_model: d.brand_model.trim(),
                serial_number: d.serial_number ? d.serial_number.trim() : null,
                problem_description: d.problem_description
                    ? d.problem_description.trim()
                    : null,
                estimated_delivery_date: d.estimated_delivery_date
                    ? d.estimated_delivery_date.trim()
                    : null,
                estimated_cost: d.estimated_cost
                    ? d.estimated_cost.trim()
                    : null,
                is_warranty: d.is_warranty ? 1 : 0,
                items: d.items.map((item) => ({
                    item_name: item.item_name.trim(),
                    item_description: item.item_description
                        ? item.item_description.trim()
                        : null,
                    is_warranty: item.is_warranty ? 1 : 0,
                })),
                product_image: d.product_image ? d.product_image.trim() : null,
            }));

            await apiService.post("/api/v1/service-requests", {
                customer_name: form.customerName.trim(),
                customer_mobile: form.customerMobile.trim(),
                customer_address: form.customerAddress.trim(),
                devices: payloadDevices,
            });

            toaster(
                "success",
                formDevices.length > 1
                    ? "Devices intake successfully registered!"
                    : "Device intake successfully registered!"
            );
            setModalOpen("register", false);
            resetForm();
            fetchRequests();
        } catch (error: any) {
            const msg =
                error.response?.data?.message || "Failed to register devices.";
            toaster("error", msg);
        } finally {
            setActionLoading((prev) => ({ ...prev, submitting: false }));
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRequest) return;

        if (
            !form.customerName.trim() ||
            !form.customerMobile.trim() ||
            !form.customerAddress.trim() ||
            !form.brandModel.trim()
        ) {
            toaster("error", "Please fill in all required fields.");
            return;
        }

        if (
            form.status === "Delivered" &&
            activeRequest.status !== "Delivered"
        ) {
            setDeliveryState({
                requestId: activeRequest.id,
                previousStatus: activeRequest.status,
                cost: "",
                isSolved: true,
                intakeItems: form.items,
                returnedItems: form.items.map((item: any) => item.item_name),
                newParts: [],
                isEditModalSource: true,
            });
            setModalOpen("delivery", true);
            return;
        }

        setActionLoading((prev) => ({ ...prev, submitting: true }));
        try {
            await apiService.put(
                `/api/v1/service-requests/${activeRequest.id}`,
                {
                    customer_name: form.customerName,
                    customer_mobile: form.customerMobile,
                    customer_address: form.customerAddress,
                    device_type: form.deviceType,
                    brand_model: form.brandModel,
                    serial_number: form.serialNumber,
                    problem_description: form.problemDesc,
                    estimated_delivery_date: form.estimatedDeliveryDate,
                    estimated_cost: form.estimatedCost,
                    status: form.status,
                    items: form.items,
                    product_image: form.productImage ? form.productImage : null,
                    is_warranty: form.isWarranty ? 1 : 0,
                }
            );

            toaster("success", "Registry updated successfully!");
            setModalOpen("edit", false);
            resetForm();
            fetchRequests();
        } catch (error: any) {
            const msg =
                error.response?.data?.message ||
                "Failed to update registry entry.";
            toaster("error", msg);
        } finally {
            setActionLoading((prev) => ({ ...prev, submitting: false }));
        }
    };

    const handleQuickStatusUpdate = async (id: number, newStatus: string) => {
        if (newStatus === "Delivered") {
            const requestObj = data.find((r) => r.id === id);
            const previousStatus = requestObj ? requestObj.status : "Received";

            setLoading(true);
            const details = await fetchRequestDetails(id);
            setLoading(false);

            if (details) {
                const intakeItems = details.items || [];
                setDeliveryState({
                    requestId: id,
                    previousStatus: previousStatus,
                    cost: "",
                    isSolved: true,
                    intakeItems: intakeItems,
                    returnedItems: intakeItems.map(
                        (item: any) => item.item_name
                    ),
                    newParts: [],
                    isEditModalSource: false,
                });
                setModalOpen("delivery", true);
            }
            return;
        }

        try {
            await apiService.patch(`/api/v1/service-requests/${id}/status`, {
                status: newStatus,
            });
            toaster("success", `Status updated to ${newStatus}`);
            fetchRequests();
        } catch (error: any) {
            toaster("error", "Failed to update repair status.");
        }
    };

    const handleDeliverySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deliveryState.requestId) return;

        setActionLoading((prev) => ({ ...prev, submittingDelivery: true }));
        try {
            if (deliveryState.isEditModalSource) {
                await apiService.put(
                    `/api/v1/service-requests/${deliveryState.requestId}`,
                    {
                        customer_name: form.customerName,
                        customer_mobile: form.customerMobile,
                        customer_address: form.customerAddress,
                        device_type: form.deviceType,
                        brand_model: form.brandModel,
                        serial_number: form.serialNumber,
                        problem_description: form.problemDesc,
                        status: "Delivered",
                        items: form.items,
                    }
                );
            }

            await apiService.patch(
                `/api/v1/service-requests/${deliveryState.requestId}/status`,
                {
                    status: "Delivered",
                    cost: deliveryState.cost
                        ? parseFloat(deliveryState.cost)
                        : null,
                    is_solved: deliveryState.isSolved,
                    returned_items: deliveryState.returnedItems,
                    new_parts: deliveryState.newParts,
                }
            );

            toaster("success", "Device successfully marked as Delivered!");
            setModalOpen("delivery", false);
            if (deliveryState.isEditModalSource) {
                setModalOpen("edit", false);
                resetForm();
            }
            fetchRequests();
        } catch (error: any) {
            console.error("Failed to complete delivery:", error);
            toaster(
                "error",
                error.response?.data?.message || "Failed to complete delivery."
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                submittingDelivery: false,
            }));
        }
    };

    const closeDeliveryModal = () => {
        setModalOpen("delivery", false);
        if (deliveryState.isEditModalSource) {
            setForm((prev) => ({
                ...prev,
                status: deliveryState.previousStatus,
            }));
        }
    };

    const handleCompleteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRequest) return;

        setActionLoading((prev) => ({ ...prev, submitting: true }));
        try {
            await apiService.patch(
                `/api/v1/service-requests/${activeRequest.id}/status`,
                {
                    status: "Completed",
                    is_solved: completeIsSolved,
                }
            );
            toaster("success", "Service request successfully Completed!");
            setModalOpen("completeConfirm", false);
            fetchRequests();
        } catch (error: any) {
            console.error("Failed to complete service request:", error);
            toaster(
                "error",
                error.response?.data?.message ||
                    "Failed to complete service request."
            );
        } finally {
            setActionLoading((prev) => ({ ...prev, submitting: false }));
        }
    };

    const handleDelete = async (id: number) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this intake registration? This action is irreversible."
            )
        ) {
            return;
        }

        try {
            await apiService.delete(`/api/v1/service-requests/${id}`);
            toaster("success", "Registration entry deleted.");
            fetchRequests();
        } catch (error: any) {
            toaster("error", "Failed to delete entry.");
        }
    };

    const resetForm = () => {
        setForm({
            customerName: "",
            customerMobile: "",
            customerAddress: "",
            deviceType: "Laptop",
            brandModel: "",
            serialNumber: "",
            problemDesc: "",
            estimatedDeliveryDate: "",
            estimatedCost: "",
            status: "Received",
            items: [],
            productImage: "",
            isWarranty: false,
        });
        setCustomItem({
            name: "",
            desc: "",
        });
        setActiveRequest(null);
        setFormDevices([
            {
                device_type: "Laptop",
                brand_model: "",
                serial_number: "",
                problem_description: "",
                estimated_delivery_date: "",
                estimated_cost: "",
                items: [],
                tempAccName: "",
                tempAccDesc: "",
                product_image: "",
                is_warranty: false,
            },
        ]);
        setCustomCategory({ input: "", pendingType: "", targetIdx: null });
    };

    const handleDownloadPdf = async (reqId: number) => {
        setActionLoading((prev) => ({ ...prev, downloadingPdf: true }));
        toaster("info", "Generating PDF report...");
        try {
            const responseData = await apiService.get(
                `/api/v1/service-requests/${reqId}/pdf`,
                { responseType: "blob" }
            );
            const blobUrl = URL.createObjectURL(responseData);
            const printWindow = window.open(blobUrl, "_blank");
            if (printWindow) {
                printWindow.focus();
                toaster("success", "PDF report opened in new print window!");
            } else {
                toaster(
                    "error",
                    "Popup blocker prevented opening the print window."
                );
            }
        } catch (error: any) {
            console.error("Failed to generate PDF report:", error);
            toaster("error", "Failed to generate PDF report.");
        } finally {
            setActionLoading((prev) => ({ ...prev, downloadingPdf: false }));
        }
    };

    // Helper colors
    const getStatusColor = (status: string) => {
        const match = STATUS_OPTIONS.find((opt) => opt.value === status);
        return match ? match.color : "bg-zinc-500/10 text-zinc-600";
    };

    // Table columns definition
    const tableColumns: Column[] = [
        {
            key: "customer_name",
            header: "Customer",
            isShortable: true,
            width: 140,
        },
        {
            key: "customer_mobile",
            header: "Mobile",
            isShortable: true,
            width: 110,
        },
        { key: "device_type", header: "Type", isShortable: true, width: 100 },
        {
            key: "brand_model",
            header: "Brand/Model",
            isShortable: true,
            width: 150,
        },
        {
            key: "items_count",
            header: "Intake Items",
            isShortable: true,
            width: 90,
        },
        { key: "status_badge", header: "Status", width: 120 },
        {
            key: "created_at_formatted",
            header: "Received Date",
            isShortable: true,
            width: 120,
        },
        { key: "actions", header: "Actions", width: 160 },
    ];

    // Map service requests data to table rows format
    const tableData = data.map((sr) => ({
        ...sr,
        brand_model: (
            <div className="flex items-center gap-2 px-1 text-left justify-start">
                {sr.product_image ? (
                    <div className="h-6 w-9 rounded overflow-hidden border border-border bg-muted/30 shrink-0 flex items-center justify-center">
                        <img
                            src={`${baseURL}/uploads/${sr.product_image}`}
                            alt=""
                            className="object-cover w-full h-full cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                    `${baseURL}/uploads/${sr.product_image}`,
                                    "_blank"
                                );
                            }}
                        />
                    </div>
                ) : (
                    <div className="h-6 w-9 rounded border border-dashed border-muted-foreground/30 bg-muted/10 shrink-0 flex items-center justify-center text-muted-foreground/45">
                        <Laptop className="h-3.5 w-3.5" />
                    </div>
                )}
                <span className="font-semibold text-foreground truncate">
                    {sr.brand_model}
                </span>
            </div>
        ),
        created_at_formatted: new Date(
            sr.created_at.endsWith("Z")
                ? sr.created_at
                : sr.created_at.replace(" ", "T") + "Z"
        ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        }),
        status_badge:
            isAdmin &&
            activeTab !== "delivered" &&
            sr.status !== "Completed" ? (
                <div className="flex justify-center items-center">
                    <Select
                        value={sr.status}
                        onValueChange={(val) =>
                            handleQuickStatusUpdate(sr.id, val)
                        }
                    >
                        <SelectTrigger
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border outline-none cursor-pointer h-7 text-center ${getStatusColor(sr.status)}`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.filter(
                                (opt) => opt.value !== "Servicing"
                            ).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="flex justify-center items-center">
                    <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(sr.status)}`}
                    >
                        {sr.status}
                    </span>
                </div>
            ),
        actions: (
            <div className="flex justify-center items-center gap-1.5 no-print">
                <button
                    onClick={() => handleOpenDetails(sr.id)}
                    className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 cursor-pointer"
                    title="View Details & Print Receipt"
                >
                    <Eye className="h-3.5 w-3.5" />
                </button>
                {isAdmin && (
                    <>
                        {sr.status !== "Completed" &&
                            sr.status !== "Delivered" && (
                                <button
                                    onClick={() =>
                                        handleOpenSendServicing(sr.id)
                                    }
                                    className="p-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/10 cursor-pointer"
                                    title="Send for Servicing"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </button>
                            )}
                        {sr.status !== "Completed" &&
                            sr.status !== "Delivered" && (
                                <button
                                    onClick={() => handleOpenEdit(sr.id)}
                                    className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/10 cursor-pointer"
                                    title="Edit Details"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        <button
                            onClick={() => handleDelete(sr.id)}
                            className="p-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/10 cursor-pointer"
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
            </div>
        ),
    }));

    return (
        <div className="space-y-6">
            {/* Dynamic inline styles for printing clean custom receipt */}
            <style>{`
        @media print {
          /* Hide everything in UI except receipt */
          body > div {
            display: none !important;
          }
          #print-receipt-overlay {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            z-index: 99999 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

            {/* HEADER ACTION CONTROLS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 border border-border p-4 rounded-xl backdrop-blur-md no-print">
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by customer name, mobile, serial..."
                        value={filters.search}
                        onChange={(e) =>
                            setFilters((prev) => ({
                                ...prev,
                                search: e.target.value,
                            }))
                        }
                        className="w-full bg-background/50 border border-input rounded-lg py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 hover:border-border transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter */}
                    {activeTab === "active" && (
                        <div className="relative">
                            <Select
                                value={filters.statusFilter || "all"}
                                onValueChange={(val) => {
                                    setFilters((prev) => ({
                                        ...prev,
                                        statusFilter: val === "all" ? "" : val,
                                    }));
                                    setPagination((prev) => ({
                                        ...prev,
                                        currentPage: 1,
                                    }));
                                }}
                            >
                                <SelectTrigger className="bg-card border border-input rounded-lg px-3 py-2 text-sm text-foreground outline-none cursor-pointer h-9 min-w-36">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Statuses
                                    </SelectItem>
                                    {STATUS_OPTIONS.filter(
                                        (opt) => opt.value !== "Delivered"
                                    ).map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            className="py-1 cursor-pointer"
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" /> */}
                        </div>
                    )}

                    {/* Register Trigger Button */}
                    {activeTab === "active" && (
                        <button
                            onClick={() => {
                                resetForm();
                                setModalOpen("register", true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:translate-y-px text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-500/15 cursor-pointer transition-all border border-indigo-500/20"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Register Device</span>
                        </button>
                    )}
                </div>
            </div>

            {/* INTENSITY GRID TABLE */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{
                        opacity: 0,
                        x: activeTab === "active" ? -20 : 20,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: activeTab === "active" ? 20 : -20 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="relative bg-card/45 border border-border/80 rounded-xl p-4 sm:p-6 backdrop-blur-md shadow-xl no-print"
                >
                    {loading && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-20">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <span className="text-xs text-muted-foreground font-semibold">
                                    Updating Registry...
                                </span>
                            </div>
                        </div>
                    )}
                    <PaginationTable
                        columns={tableColumns}
                        data={tableData}
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        rowsPerPage={pagination.rowsPerPage}
                        onPageChange={(page) =>
                            setPagination((prev) => ({
                                ...prev,
                                currentPage: page,
                            }))
                        }
                        onRowsPerPageChange={(rows) =>
                            setPagination((prev) => ({
                                ...prev,
                                rowsPerPage: rows,
                            }))
                        }
                        onSort={(key, dir) => {
                            setPagination((prev) => ({
                                ...prev,
                                sortBy: key,
                                sortOrder: dir,
                            }));
                        }}
                        title={
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-indigo-500" />
                                <span className="font-bold text-foreground">
                                    {activeTab === "active"
                                        ? "Receive Registry"
                                        : "Delivered List"}{" "}
                                    ({data.length})
                                </span>
                            </div>
                        }
                    />
                </motion.div>
            </AnimatePresence>

            {/* REGISTRATION MODAL */}
            <Dialog
                open={modals.register}
                onOpenChange={(open) => setModalOpen("register", open)}
            >
                <DialogContent
                    unbounded
                    className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border shadow-2xl rounded-xl no-print"
                >
                    <DialogHeader className="bg-accent/10 -mx-6 -mt-6 p-6 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Laptop className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    New Device Intake Registration
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Register customer and device details along
                                    with received items
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form
                        onSubmit={handleRegisterSubmit}
                        className="space-y-6 mt-4"
                    >
                        {/* 1. Customer Section */}
                        <div>
                            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>Customer Information</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                                        Customer Name{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Name"
                                        value={form.customerName}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                customerName: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                                        Mobile Number{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            required
                                            placeholder="e.g., 9876543210"
                                            value={form.customerMobile}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    customerMobile:
                                                        e.target.value,
                                                }))
                                            }
                                            className="flex-1 bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        />
                                        <button
                                            type="button"
                                            disabled={searchingMobile}
                                            onClick={
                                                handleSearchCustomerByMobile
                                            }
                                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all border border-indigo-500 flex items-center justify-center gap-1.5 min-w-22.5"
                                        >
                                            {searchingMobile ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="h-4 w-4" />
                                            )}
                                            <span>Search</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                                        Address{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </label>
                                    <textarea
                                        required
                                        placeholder="Street, City, Zip Code"
                                        value={form.customerAddress}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                customerAddress: e.target.value,
                                            }))
                                        }
                                        rows={2}
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-border/60" />

                        {/* 2. Devices Section */}
                        <div className="space-y-6">
                            {formDevices.map((device, devIdx) => (
                                <div
                                    key={devIdx}
                                    className="p-5 border border-border bg-accent/5 rounded-xl space-y-4 relative"
                                >
                                    {/* Device Header */}
                                    <div className="flex justify-between items-center pb-2 border-b border-border/60">
                                        <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                                            <Laptop className="h-4 w-4 text-indigo-500" />
                                            <span>
                                                Device #{devIdx + 1}{" "}
                                                Specifications
                                            </span>
                                        </h4>
                                        {formDevices.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveDeviceField(
                                                        devIdx
                                                    )
                                                }
                                                className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-destructive/15 animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Remove Device</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Device Input Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Device Type
                                            </label>
                                            <Select
                                                value={device.device_type}
                                                onValueChange={(val) =>
                                                    handleDeviceTypeChangeForReg(
                                                        devIdx,
                                                        val
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full bg-background/50 border border-input rounded-lg px-3 py-2 text-sm text-foreground outline-none cursor-pointer h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {deviceTypes.map((type) => (
                                                        <SelectItem
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Brand / Model{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Dell XPS 15"
                                                value={device.brand_model}
                                                onChange={(e) => {
                                                    const updated = [
                                                        ...formDevices,
                                                    ];
                                                    updated[
                                                        devIdx
                                                    ].brand_model =
                                                        e.target.value;
                                                    setFormDevices(updated);
                                                }}
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Serial Number (S/N)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="S/N: 12AB34CD"
                                                value={device.serial_number}
                                                onChange={(e) => {
                                                    const updated = [
                                                        ...formDevices,
                                                    ];
                                                    updated[
                                                        devIdx
                                                    ].serial_number =
                                                        e.target.value;
                                                    setFormDevices(updated);
                                                }}
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Estimated Delivery
                                            </label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={`w-full flex items-center justify-between bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all ${
                                                            !device.estimated_delivery_date &&
                                                            "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {device.estimated_delivery_date ? (
                                                            format(
                                                                new Date(
                                                                    device.estimated_delivery_date
                                                                ),
                                                                "PPP"
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick a date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="h-4 w-4 opacity-50" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto p-0"
                                                    align="start"
                                                >
                                                    <Calendar
                                                        mode="single"
                                                        selected={
                                                            device.estimated_delivery_date
                                                                ? new Date(
                                                                      device.estimated_delivery_date
                                                                  )
                                                                : undefined
                                                        }
                                                        onSelect={(date) => {
                                                            const updated = [
                                                                ...formDevices,
                                                            ];
                                                            updated[
                                                                devIdx
                                                            ].estimated_delivery_date =
                                                                date
                                                                    ? format(
                                                                          date,
                                                                          "yyyy-MM-dd"
                                                                      )
                                                                    : "";
                                                            setFormDevices(
                                                                updated
                                                            );
                                                        }}
                                                        disabled={(date) =>
                                                            date <
                                                            new Date(
                                                                new Date().setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0
                                                                )
                                                            )
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Estimated Cost
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="₹0.00"
                                                value={device.estimated_cost}
                                                onChange={(e) => {
                                                    const updated = [
                                                        ...formDevices,
                                                    ];
                                                    updated[
                                                        devIdx
                                                    ].estimated_cost =
                                                        e.target.value;
                                                    setFormDevices(updated);
                                                }}
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                                                Has Warranty?
                                            </label>
                                            <div className="flex gap-4 items-center h-9">
                                                <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer select-none">
                                                    <input
                                                        type="radio"
                                                        name={`has_warranty_reg_${devIdx}`}
                                                        checked={
                                                            device.is_warranty ===
                                                            true
                                                        }
                                                        onChange={() => {
                                                            const updated = [
                                                                ...formDevices,
                                                            ];
                                                            updated[
                                                                devIdx
                                                            ].is_warranty =
                                                                true;
                                                            setFormDevices(
                                                                updated
                                                            );
                                                        }}
                                                        className="accent-indigo-600 h-4 w-4"
                                                    />
                                                    <span>Yes</span>
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer select-none">
                                                    <input
                                                        type="radio"
                                                        name={`has_warranty_reg_${devIdx}`}
                                                        checked={
                                                            device.is_warranty ===
                                                                false ||
                                                            device.is_warranty ===
                                                                undefined
                                                        }
                                                        onChange={() => {
                                                            const updated = [
                                                                ...formDevices,
                                                            ];
                                                            updated[
                                                                devIdx
                                                            ].is_warranty =
                                                                false;
                                                            setFormDevices(
                                                                updated
                                                            );
                                                        }}
                                                        className="accent-indigo-600 h-4 w-4"
                                                    />
                                                    <span>No</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Fault Description / Comments
                                            </label>
                                            <textarea
                                                placeholder="Describe issues reported (e.g. Screen flickering, OS boot loop, RAM replacement)"
                                                value={
                                                    device.problem_description
                                                }
                                                onChange={(e) => {
                                                    const updated = [
                                                        ...formDevices,
                                                    ];
                                                    updated[
                                                        devIdx
                                                    ].problem_description =
                                                        e.target.value;
                                                    setFormDevices(updated);
                                                }}
                                                rows={3}
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                                            />
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Product / Device Image
                                                (Optional)
                                            </label>
                                            <div className="flex items-center gap-4 p-3 bg-background/50 border border-input rounded-lg hover:border-indigo-500/50 transition-colors">
                                                {device.product_image ? (
                                                    <div className="relative h-16 w-28 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                                                        <img
                                                            src={`${baseURL}/uploads/${device.product_image}`}
                                                            alt="Preview"
                                                            className="object-cover w-full h-full"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated =
                                                                    [
                                                                        ...formDevices,
                                                                    ];
                                                                updated[
                                                                    devIdx
                                                                ].product_image =
                                                                    "";
                                                                setFormDevices(
                                                                    updated
                                                                );
                                                            }}
                                                            className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="h-16 w-28 rounded-lg border border-dashed border-muted-foreground/45 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground shrink-0 select-none">
                                                        <Upload className="h-4 w-4 text-muted-foreground/60" />
                                                        <span className="text-[10px] mt-1 font-medium text-muted-foreground/50">
                                                            No Image
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                                        Upload a photo of the
                                                        physical product/device
                                                        to track its condition.
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id={`reg-image-file-${devIdx}`}
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file =
                                                                e.target
                                                                    .files?.[0];
                                                            if (file) {
                                                                const uploadedFilename =
                                                                    await handleImageUpload(
                                                                        file
                                                                    );
                                                                if (
                                                                    uploadedFilename
                                                                ) {
                                                                    const updated =
                                                                        [
                                                                            ...formDevices,
                                                                        ];
                                                                    updated[
                                                                        devIdx
                                                                    ].product_image =
                                                                        uploadedFilename;
                                                                    setFormDevices(
                                                                        updated
                                                                    );
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`reg-image-file-${devIdx}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                                    >
                                                        <Upload className="h-3.5 w-3.5" />
                                                        <span>
                                                            Choose Image
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accessories Checklist Section */}
                                    <div className="pt-3 border-t border-border/40 space-y-2">
                                        <div>
                                            <h5 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Layers className="h-3.5 w-3.5" />
                                                <span>
                                                    Accessories / Items Received
                                                    with this Device
                                                </span>
                                            </h5>
                                            <p className="text-[10px] text-muted-foreground">
                                                Select items physically
                                                received. Leave specifications
                                                blank if none.
                                            </p>
                                        </div>

                                        {/* Common item chips */}
                                        <div className="flex flex-wrap gap-2">
                                            {accessories.map((item) => {
                                                const isSelected =
                                                    device.items.some(
                                                        (i) =>
                                                            i.item_name === item
                                                    );
                                                return (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleRegDeviceCommonItem(
                                                                devIdx,
                                                                item
                                                            )
                                                        }
                                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${
                                                            isSelected
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                                : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/85"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <Check className="h-3 w-3" />
                                                        )}
                                                        <span>{item}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Custom intake item input */}
                                        <div className="flex flex-col sm:flex-row gap-2 bg-accent/10 p-2.5 rounded-lg border border-border/30">
                                            <input
                                                type="text"
                                                placeholder="Custom Item Name (e.g., Pen Drive)"
                                                value={device.tempAccName || ""}
                                                onChange={(e) => {
                                                    const updated = [
                                                        ...formDevices,
                                                    ];
                                                    updated[
                                                        devIdx
                                                    ].tempAccName =
                                                        e.target.value;
                                                    setFormDevices(updated);
                                                }}
                                                className="flex-1 bg-background border border-input rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:border-indigo-500"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Serial/Description (Optional)"
                                                value={device.tempAccDesc || ""}
                                                onChange={(e) => {
                                                    const updated = [
                                                        ...formDevices,
                                                    ];
                                                    updated[
                                                        devIdx
                                                    ].tempAccDesc =
                                                        e.target.value;
                                                    setFormDevices(updated);
                                                }}
                                                className="flex-1 bg-background border border-input rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:border-indigo-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleAddRegDeviceCustomItem(
                                                        devIdx
                                                    )
                                                }
                                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500"
                                            >
                                                Add Item
                                            </button>
                                        </div>

                                        {/* Active checklist display */}
                                        {device.items.length > 0 ? (
                                            <div className="border border-border/50 rounded-lg divide-y divide-border/40 bg-background/50 overflow-hidden max-h-40 overflow-y-auto">
                                                <div className="grid grid-cols-12 px-3 py-1.5 bg-muted/20 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    <div className="col-span-3">
                                                        Item Name
                                                    </div>
                                                    <div className="col-span-5">
                                                        Specifications / Serial
                                                        / Notes
                                                    </div>
                                                    <div className="col-span-3 text-center">
                                                        In Warranty?
                                                    </div>
                                                    <div className="col-span-1 text-center">
                                                        Action
                                                    </div>
                                                </div>
                                                {device.items.map(
                                                    (item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="grid grid-cols-12 px-3 py-1.5 items-center gap-2"
                                                        >
                                                            <div className="col-span-3 text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                                <span className="truncate">
                                                                    {
                                                                        item.item_name
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="col-span-5">
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        item.item_description ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        handleUpdateRegDeviceItemDesc(
                                                                            devIdx,
                                                                            idx,
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    placeholder="e.g. S/N, Brand, Condition note..."
                                                                    className="w-full bg-background border border-border/80 rounded px-2 py-0.5 text-xs text-foreground placeholder-muted-foreground/60 outline-none focus:border-indigo-500/50"
                                                                />
                                                            </div>
                                                            <div className="col-span-3 flex justify-center gap-3">
                                                                <label className="flex items-center gap-1 text-[11px] text-foreground font-semibold cursor-pointer select-none">
                                                                    <input
                                                                        type="radio"
                                                                        name={`warranty-reg-${devIdx}-${idx}`}
                                                                        checked={
                                                                            item.is_warranty ===
                                                                                true ||
                                                                            item.is_warranty ===
                                                                                1
                                                                        }
                                                                        onChange={() =>
                                                                            handleUpdateRegDeviceItemWarranty(
                                                                                devIdx,
                                                                                idx,
                                                                                true
                                                                            )
                                                                        }
                                                                        className="accent-indigo-600 h-3 w-3"
                                                                    />
                                                                    <span>
                                                                        Yes
                                                                    </span>
                                                                </label>
                                                                <label className="flex items-center gap-1 text-[11px] text-foreground font-semibold cursor-pointer select-none">
                                                                    <input
                                                                        type="radio"
                                                                        name={`warranty-reg-${devIdx}-${idx}`}
                                                                        checked={
                                                                            item.is_warranty ===
                                                                                false ||
                                                                            item.is_warranty ===
                                                                                0 ||
                                                                            item.is_warranty ===
                                                                                undefined
                                                                        }
                                                                        onChange={() =>
                                                                            handleUpdateRegDeviceItemWarranty(
                                                                                devIdx,
                                                                                idx,
                                                                                false
                                                                            )
                                                                        }
                                                                        className="accent-indigo-600 h-3 w-3"
                                                                    />
                                                                    <span>
                                                                        No
                                                                    </span>
                                                                </label>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleRemoveRegDeviceItem(
                                                                            devIdx,
                                                                            idx
                                                                        )
                                                                    }
                                                                    className="p-0.5 text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center p-3 border border-dashed border-border/60 rounded-lg text-[11px] text-muted-foreground italic bg-background/25">
                                                No accessories registered for
                                                this device. Standard standalone
                                                unit assumed.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add Another Device Button */}
                            <button
                                type="button"
                                onClick={handleAddDeviceField}
                                className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-indigo-500/50"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Another Device</span>
                            </button>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                            <button
                                type="button"
                                onClick={() => setModalOpen("register", false)}
                                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading.submitting}
                                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-500/10 cursor-pointer transition-all border border-indigo-500"
                            >
                                {actionLoading.submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Registering...</span>
                                    </>
                                ) : (
                                    <span>Complete Registration</span>
                                )}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* EDIT MODAL */}
            <Dialog
                open={modals.edit}
                onOpenChange={(open) => setModalOpen("edit", open)}
            >
                <DialogContent
                    unbounded
                    className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border shadow-2xl rounded-xl no-print"
                >
                    {isAdmin && activeRequest && (
                        <>
                            {/* Modal Header */}
                            <DialogHeader className="bg-accent/10 -mx-6 -mt-6 p-6 border-b border-border">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Edit3 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-lg font-bold text-foreground">
                                            Edit Registration details (ID: #
                                            {activeRequest.id})
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                            Modify customer records, device
                                            details, and intake checklist items
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Modal Body */}
                            <form
                                onSubmit={handleEditSubmit}
                                className="space-y-6 mt-4"
                            >
                                {/* Status selector */}
                                <div className="bg-accent/15 p-4 rounded-lg border border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground uppercase">
                                            Intake Progress Status
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground">
                                            Set current diagnostic or repair
                                            status
                                        </p>
                                    </div>
                                    <div>
                                        <Select
                                            value={form.status}
                                            onValueChange={(val) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    status: val,
                                                }))
                                            }
                                        >
                                            <SelectTrigger
                                                className={`w-full bg-background border border-input rounded-lg px-3 py-2 text-sm font-semibold outline-none cursor-pointer h-9 ${getStatusColor(form.status)}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.filter(
                                                    (opt) =>
                                                        opt.value !==
                                                        "Servicing"
                                                ).map((opt) => (
                                                    <SelectItem
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* 1. Customer Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        <span>Customer Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Customer Name{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={form.customerName}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        customerName:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Mobile Number{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                value={form.customerMobile}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        customerMobile:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Address{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </label>
                                            <textarea
                                                required
                                                value={form.customerAddress}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        customerAddress:
                                                            e.target.value,
                                                    }))
                                                }
                                                rows={2}
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-border/60" />

                                {/* 2. Device Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Laptop className="h-3.5 w-3.5" />
                                        <span>Device Specifications</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Device Type
                                            </label>
                                            <Select
                                                value={form.deviceType}
                                                onValueChange={
                                                    handleDeviceTypeChange
                                                }
                                            >
                                                <SelectTrigger className="w-full bg-background/50 border border-input rounded-lg px-3 py-2 text-sm text-foreground outline-none cursor-pointer h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {deviceTypes.map((type) => (
                                                        <SelectItem
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Brand / Model{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={form.brandModel}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        brandModel:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Serial Number (S/N)
                                            </label>
                                            <input
                                                type="text"
                                                value={form.serialNumber}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        serialNumber:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Estimated Delivery
                                            </label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={`w-full flex items-center justify-between bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all ${
                                                            !form.estimatedDeliveryDate &&
                                                            "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {form.estimatedDeliveryDate ? (
                                                            format(
                                                                new Date(
                                                                    form.estimatedDeliveryDate
                                                                ),
                                                                "PPP"
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick a date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="h-4 w-4 opacity-50" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto p-0"
                                                    align="start"
                                                >
                                                    <Calendar
                                                        mode="single"
                                                        selected={
                                                            form.estimatedDeliveryDate
                                                                ? new Date(
                                                                      form.estimatedDeliveryDate
                                                                  )
                                                                : undefined
                                                        }
                                                        onSelect={(date) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                estimatedDeliveryDate:
                                                                    date
                                                                        ? format(
                                                                              date,
                                                                              "yyyy-MM-dd"
                                                                          )
                                                                        : "",
                                                            }))
                                                        }
                                                        disabled={(date) =>
                                                            date <
                                                            new Date(
                                                                new Date().setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0
                                                                )
                                                            )
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Estimated Cost
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="₹0.00"
                                                value={form.estimatedCost}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        estimatedCost:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                                                Has Warranty?
                                            </label>
                                            <div className="flex gap-4 items-center h-9">
                                                <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer select-none">
                                                    <input
                                                        type="radio"
                                                        name="has_warranty_edit"
                                                        checked={
                                                            form.isWarranty ===
                                                            true
                                                        }
                                                        onChange={() =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                isWarranty: true,
                                                            }))
                                                        }
                                                        className="accent-indigo-600 h-4 w-4"
                                                    />
                                                    <span>Yes</span>
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer select-none">
                                                    <input
                                                        type="radio"
                                                        name="has_warranty_edit"
                                                        checked={
                                                            form.isWarranty ===
                                                            false
                                                        }
                                                        onChange={() =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                isWarranty: false,
                                                            }))
                                                        }
                                                        className="accent-indigo-600 h-4 w-4"
                                                    />
                                                    <span>No</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Fault Description / Comments
                                            </label>
                                            <textarea
                                                value={form.problemDesc}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        problemDesc:
                                                            e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                                            />
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                                                Product / Device Image
                                                (Optional)
                                            </label>
                                            <div className="flex items-center gap-4 p-3 bg-background/50 border border-input rounded-lg hover:border-indigo-500/50 transition-colors">
                                                {form.productImage ? (
                                                    <div className="relative h-16 w-28 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                                                        <img
                                                            src={`${baseURL}/uploads/${form.productImage}`}
                                                            alt="Preview"
                                                            className="object-cover w-full h-full"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setForm(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        productImage:
                                                                            "",
                                                                    })
                                                                );
                                                            }}
                                                            className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="h-16 w-28 rounded-lg border border-dashed border-muted-foreground/45 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground shrink-0 select-none">
                                                        <Upload className="h-4 w-4 text-muted-foreground/60" />
                                                        <span className="text-[10px] mt-1 font-medium text-muted-foreground/50">
                                                            No Image
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                                        Upload or update the
                                                        photo of the physical
                                                        product/device.
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="edit-image-file"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file =
                                                                e.target
                                                                    .files?.[0];
                                                            if (file) {
                                                                const uploadedFilename =
                                                                    await handleImageUpload(
                                                                        file
                                                                    );
                                                                if (
                                                                    uploadedFilename
                                                                ) {
                                                                    setForm(
                                                                        (
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            productImage:
                                                                                uploadedFilename,
                                                                        })
                                                                    );
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor="edit-image-file"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                                    >
                                                        <Upload className="h-3.5 w-3.5" />
                                                        <span>
                                                            Choose Image
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-border/60" />

                                {/* 3. Items Checklist Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5" />
                                        <span>
                                            Accessories / Items Received
                                        </span>
                                    </h3>

                                    {/* Common item chips */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {accessories.map((item) => {
                                            const isSelected = form.items.some(
                                                (i) => i.item_name === item
                                            );
                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() =>
                                                        handleToggleCommonItem(
                                                            item
                                                        )
                                                    }
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <Check className="h-3.5 w-3.5" />
                                                    )}
                                                    <span>{item}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom intake item input */}
                                    <div className="flex flex-col sm:flex-row gap-3 bg-accent/15 p-3 rounded-lg border border-border/40 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Custom Item Name (e.g., Pen Drive)"
                                            value={customItem.name}
                                            onChange={(e) =>
                                                setCustomItem((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                            className="flex-1 bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-indigo-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Serial/Description (Optional)"
                                            value={customItem.desc}
                                            onChange={(e) =>
                                                setCustomItem((prev) => ({
                                                    ...prev,
                                                    desc: e.target.value,
                                                }))
                                            }
                                            className="flex-1 bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCustomItem}
                                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500"
                                        >
                                            Add Item
                                        </button>
                                    </div>

                                    {/* Active checklist display */}
                                    {form.items.length > 0 ? (
                                        <div className="border border-border/70 rounded-lg divide-y divide-border/60 bg-background/50 overflow-hidden">
                                            <div className="grid grid-cols-12 px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                <div className="col-span-3">
                                                    Item Name
                                                </div>
                                                <div className="col-span-5">
                                                    Specifications / Serial /
                                                    Notes
                                                </div>
                                                <div className="col-span-3 text-center">
                                                    In Warranty?
                                                </div>
                                                <div className="col-span-1 text-center">
                                                    Action
                                                </div>
                                            </div>
                                            {form.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid grid-cols-12 px-4 py-2.5 items-center gap-2"
                                                >
                                                    <div className="col-span-3 text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                        <span className="truncate">
                                                            {item.item_name}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-5">
                                                        <input
                                                            type="text"
                                                            value={
                                                                item.item_description ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleUpdateItemDescription(
                                                                    idx,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="e.g. S/N, Brand, Condition note..."
                                                            className="w-full bg-background border border-border/80 rounded px-2.5 py-1 text-xs text-foreground placeholder-muted-foreground/60 outline-none focus:border-indigo-500/50"
                                                        />
                                                    </div>
                                                    <div className="col-span-3 flex justify-center gap-3">
                                                        <label className="flex items-center gap-1 text-[11px] text-foreground font-semibold cursor-pointer select-none">
                                                            <input
                                                                type="radio"
                                                                name={`warranty-edit-${idx}`}
                                                                checked={
                                                                    item.is_warranty ===
                                                                        true ||
                                                                    item.is_warranty ===
                                                                        1
                                                                }
                                                                onChange={() =>
                                                                    handleUpdateItemWarranty(
                                                                        idx,
                                                                        true
                                                                    )
                                                                }
                                                                className="accent-indigo-600 h-3 w-3"
                                                            />
                                                            <span>Yes</span>
                                                        </label>
                                                        <label className="flex items-center gap-1 text-[11px] text-foreground font-semibold cursor-pointer select-none">
                                                            <input
                                                                type="radio"
                                                                name={`warranty-edit-${idx}`}
                                                                checked={
                                                                    item.is_warranty ===
                                                                        false ||
                                                                    item.is_warranty ===
                                                                        0 ||
                                                                    item.is_warranty ===
                                                                        undefined
                                                                }
                                                                onChange={() =>
                                                                    handleUpdateItemWarranty(
                                                                        idx,
                                                                        false
                                                                    )
                                                                }
                                                                className="accent-indigo-600 h-3 w-3"
                                                            />
                                                            <span>No</span>
                                                        </label>
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveItem(
                                                                    idx
                                                                )
                                                            }
                                                            className="p-1 text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-4 border border-dashed border-border/70 rounded-lg text-xs text-muted-foreground italic bg-background/30">
                                            No accessories registered.
                                            Standalone unit assumed.
                                        </div>
                                    )}
                                </div>

                                {/* Submit Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModalOpen("edit", false)
                                        }
                                        className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading.submitting}
                                        className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-500/10 cursor-pointer transition-all border border-indigo-500"
                                    >
                                        {actionLoading.submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <span>Save Changes</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* DETAILS VIEW / PHYSICAL RECEIPT MODAL */}
            <ServiceDetailsDialog
                isOpen={modals.details}
                onClose={() => setModalOpen("details", false)}
                activeRequest={activeRequest}
                companies={companies}
                getStatusColor={getStatusColor}
                downloadingPdf={actionLoading.downloadingPdf}
                handleDownloadPdf={handleDownloadPdf}
                onCompleteClick={() => {
                    setCompleteIsSolved(true);
                    setModalOpen("details", false);
                    setModalOpen("completeConfirm", true);
                }}
                onDeliverClick={() => {
                    if (!activeRequest) return;
                    const intakeItems = activeRequest.items || [];
                    setDeliveryState({
                        requestId: activeRequest.id,
                        previousStatus: activeRequest.status,
                        cost: "",
                        isSolved:
                            activeRequest.is_solved === 1 ||
                            activeRequest.is_solved === true,
                        intakeItems: intakeItems,
                        returnedItems: intakeItems.map(
                            (item: any) => item.item_name
                        ),
                        newParts: [],
                        isEditModalSource: false,
                    });
                    setModalOpen("details", false);
                    setModalOpen("delivery", true);
                }}
            />

            {/* OTHER CATEGORY INPUT DIALOG */}
            <Dialog
                open={modals.otherCategory}
                onOpenChange={(open) => setModalOpen("otherCategory", open)}
            >
                <DialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Add Custom Device Type
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                            Please specify the new device category/type you want
                            to use.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <input
                            type="text"
                            placeholder="e.g. Gaming Console, Projector"
                            value={customCategory.input}
                            onChange={(e) =>
                                setCustomCategory((prev) => ({
                                    ...prev,
                                    input: e.target.value,
                                }))
                            }
                            className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const clean = customCategory.input.trim();
                                    if (clean) {
                                        if (clean.toLowerCase() === "other") {
                                            toaster(
                                                "error",
                                                "Category name cannot be 'Other'"
                                            );
                                            return;
                                        }
                                        setCustomCategory((prev) => ({
                                            ...prev,
                                            pendingType: clean,
                                        }));
                                        setModals((prev) => ({
                                            ...prev,
                                            otherCategory: false,
                                            saveConfirmation: true,
                                        }));
                                    } else {
                                        toaster(
                                            "error",
                                            "Category name cannot be empty"
                                        );
                                    }
                                }
                            }}
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setModalOpen("otherCategory", false);
                                    setCustomCategory({
                                        input: "",
                                        pendingType: "",
                                        targetIdx: null,
                                    });
                                }}
                                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const clean = customCategory.input.trim();
                                    if (!clean) {
                                        toaster(
                                            "error",
                                            "Category name cannot be empty"
                                        );
                                        return;
                                    }
                                    if (clean.toLowerCase() === "other") {
                                        toaster(
                                            "error",
                                            "Category name cannot be 'Other'"
                                        );
                                        return;
                                    }
                                    setCustomCategory((prev) => ({
                                        ...prev,
                                        pendingType: clean,
                                    }));
                                    setModals((prev) => ({
                                        ...prev,
                                        otherCategory: false,
                                        saveConfirmation: true,
                                    }));
                                }}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-500/10 cursor-pointer transition-all border border-indigo-500"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* SAVE FOR FUTURE CONFIRMATION DIALOG */}
            <Dialog
                open={modals.saveConfirmation}
                onOpenChange={(open) => setModalOpen("saveConfirmation", open)}
            >
                <DialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Save for Future?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                            Do you want to save{" "}
                            <strong>"{customCategory.pendingType}"</strong> as a
                            category for future use?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setModalOpen("saveConfirmation", false);
                                setCustomCategory({
                                    input: "",
                                    pendingType: "",
                                    targetIdx: null,
                                });
                            }}
                            className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors sm:order-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveCustomType(false)}
                            className="px-4 py-2 bg-accent hover:bg-accent/80 border border-border rounded-lg text-sm font-semibold text-foreground cursor-pointer transition-colors sm:order-2"
                        >
                            No, Just Use Once
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveCustomType(true)}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-500/10 cursor-pointer transition-all border border-indigo-500 sm:order-3"
                        >
                            Yes, Save It
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DELIVERY DETAILS MODAL */}
            <Dialog
                open={modals.delivery}
                onOpenChange={(open) => {
                    if (!open) closeDeliveryModal();
                }}
            >
                <DialogContent
                    unbounded={true}
                    className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border shadow-2xl rounded-xl"
                >
                    <DialogHeader className="bg-emerald-500/10 -mx-6 -mt-6 p-6 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Complete Delivery Details
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Specify cost, returned accessories, and
                                    parts replaced
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form
                        onSubmit={handleDeliverySubmit}
                        className="space-y-6 mt-4"
                    >
                        {/* 1. Cost and Solved Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">
                                    Total Service Cost (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="e.g. 150.00 (Optional)"
                                    value={deliveryState.cost}
                                    onChange={(e) =>
                                        setDeliveryState({
                                            ...deliveryState,
                                            cost: e.target.value,
                                        })
                                    }
                                    className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                                    Is the problem solved?
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="is_solved"
                                            checked={
                                                deliveryState.isSolved === true
                                            }
                                            onChange={() =>
                                                setDeliveryState({
                                                    ...deliveryState,
                                                    isSolved: true,
                                                })
                                            }
                                            className="accent-indigo-600 h-4 w-4"
                                        />
                                        <span>Yes, Solved</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="is_solved"
                                            checked={
                                                deliveryState.isSolved === false
                                            }
                                            onChange={() =>
                                                setDeliveryState({
                                                    ...deliveryState,
                                                    isSolved: false,
                                                })
                                            }
                                            className="accent-indigo-600 h-4 w-4"
                                        />
                                        <span>No, Unsolved</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <hr className="border-border/60" />

                        {/* 2. Returned Items Checklist */}
                        <div>
                            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                                Accessories / Items Returned to Customer
                            </h3>
                            {deliveryState.intakeItems.length > 0 ? (
                                <div className="bg-background/40 border border-border p-4 rounded-xl space-y-3 max-h-48 overflow-y-auto">
                                    {deliveryState.intakeItems.map(
                                        (item, idx) => {
                                            const isChecked =
                                                deliveryState.returnedItems.includes(
                                                    item.item_name
                                                );
                                            return (
                                                <label
                                                    key={idx}
                                                    className="flex items-start gap-3 text-sm text-foreground font-semibold cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setDeliveryState(
                                                                    {
                                                                        ...deliveryState,
                                                                        returnedItems:
                                                                            deliveryState.returnedItems.filter(
                                                                                (
                                                                                    i
                                                                                ) =>
                                                                                    i !==
                                                                                    item.item_name
                                                                            ),
                                                                    }
                                                                );
                                                            } else {
                                                                setDeliveryState(
                                                                    {
                                                                        ...deliveryState,
                                                                        returnedItems:
                                                                            [
                                                                                ...deliveryState.returnedItems,
                                                                                item.item_name,
                                                                            ],
                                                                    }
                                                                );
                                                            }
                                                        }}
                                                        className="accent-indigo-600 h-4 w-4 mt-0.5"
                                                    />
                                                    <div>
                                                        <span>
                                                            {item.item_name}
                                                        </span>
                                                        {item.item_description && (
                                                            <p className="text-xs text-muted-foreground font-normal italic">
                                                                Note:{" "}
                                                                {
                                                                    item.item_description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        }
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic bg-accent/5 p-3 rounded-lg border border-dashed text-center">
                                    No accessories were registered with this
                                    device intake.
                                </p>
                            )}
                        </div>

                        <hr className="border-border/60" />

                        {/* 3. New Replaced Parts Section */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    New Replaced Parts (Optional)
                                </h3>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDeliveryState({
                                            ...deliveryState,
                                            newParts: [
                                                ...deliveryState.newParts,
                                                {
                                                    name: "",
                                                    serial: "",
                                                    brand: "",
                                                    cost: "",
                                                },
                                            ],
                                        })
                                    }
                                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded font-semibold cursor-pointer flex items-center gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Part</span>
                                </button>
                            </div>

                            {deliveryState.newParts.length > 0 ? (
                                <div className="space-y-4">
                                    {deliveryState.newParts.map(
                                        (part, partIdx) => (
                                            <div
                                                key={partIdx}
                                                className="bg-background/30 border border-border p-4 rounded-xl space-y-3 relative"
                                            >
                                                <div className="absolute top-2 right-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                newParts:
                                                                    deliveryState.newParts.filter(
                                                                        (
                                                                            _,
                                                                            i
                                                                        ) =>
                                                                            i !==
                                                                            partIdx
                                                                    ),
                                                            })
                                                        }
                                                        className="p-1 text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                                            Part Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. SSD 1TB"
                                                            value={part.name}
                                                            onChange={(e) => {
                                                                const updated =
                                                                    [
                                                                        ...deliveryState.newParts,
                                                                    ];
                                                                updated[
                                                                    partIdx
                                                                ].name =
                                                                    e.target.value;
                                                                setDeliveryState(
                                                                    {
                                                                        ...deliveryState,
                                                                        newParts:
                                                                            updated,
                                                                    }
                                                                );
                                                            }}
                                                            className="w-full bg-background border border-input rounded px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                                            Brand
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Crucial"
                                                            value={part.brand}
                                                            onChange={(e) => {
                                                                const updated =
                                                                    [
                                                                        ...deliveryState.newParts,
                                                                    ];
                                                                updated[
                                                                    partIdx
                                                                ].brand =
                                                                    e.target.value;
                                                                setDeliveryState(
                                                                    {
                                                                        ...deliveryState,
                                                                        newParts:
                                                                            updated,
                                                                    }
                                                                );
                                                            }}
                                                            className="w-full bg-background border border-input rounded px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                                            Serial Number (S/N)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. SN-987654"
                                                            value={part.serial}
                                                            onChange={(e) => {
                                                                const updated =
                                                                    [
                                                                        ...deliveryState.newParts,
                                                                    ];
                                                                updated[
                                                                    partIdx
                                                                ].serial =
                                                                    e.target.value;
                                                                setDeliveryState(
                                                                    {
                                                                        ...deliveryState,
                                                                        newParts:
                                                                            updated,
                                                                    }
                                                                );
                                                            }}
                                                            className="w-full bg-background border border-input rounded px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                                            Part Cost (₹)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="e.g. 60.00"
                                                            value={part.cost}
                                                            onChange={(e) => {
                                                                const updated =
                                                                    [
                                                                        ...deliveryState.newParts,
                                                                    ];
                                                                updated[
                                                                    partIdx
                                                                ].cost =
                                                                    e.target.value;
                                                                setDeliveryState(
                                                                    {
                                                                        ...deliveryState,
                                                                        newParts:
                                                                            updated,
                                                                    }
                                                                );
                                                            }}
                                                            className="w-full bg-background border border-input rounded px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic bg-accent/5 p-3 rounded-lg border border-dashed text-center">
                                    No new parts registered yet.
                                </p>
                            )}
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button
                                type="button"
                                onClick={closeDeliveryModal}
                                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading.submittingDelivery}
                                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md shadow-emerald-500/10 cursor-pointer transition-all border border-emerald-500"
                            >
                                {actionLoading.submittingDelivery ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Complete Delivery</span>
                                )}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* COMPLETE REQUEST CONFIRMATION DIALOG */}
            <CompleteConfirmDialog
                isOpen={modals.completeConfirm}
                onClose={() => setModalOpen("completeConfirm", false)}
                activeRequest={activeRequest}
                completeIsSolved={completeIsSolved}
                setCompleteIsSolved={setCompleteIsSolved}
                handleCompleteSubmit={handleCompleteSubmit}
                submitting={actionLoading.submitting}
                onCancelClick={() => {
                    setModalOpen("completeConfirm", false);
                    setModalOpen("details", true); // Go back to details view
                }}
            />

            {/* SEND FOR SERVICING DIALOG */}
            <Dialog
                open={modals.sendServicing}
                onOpenChange={(open) => setModalOpen("sendServicing", open)}
            >
                <DialogContent
                    unbounded={true}
                    className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border shadow-2xl rounded-xl"
                >
                    <DialogHeader className="bg-cyan-500/10 -mx-6 -mt-6 p-6 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-cyan-600/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                <Send className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Send for Servicing
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Fill in servicing dispatch details and
                                    select items to dispatch
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form
                        onSubmit={handleSendServicingSubmit}
                        className="space-y-6 mt-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 flex flex-col justify-end">
                                <label className="text-xs font-semibold text-muted-foreground uppercase block">
                                    Dispatch Date{" "}
                                    <span className="text-destructive">*</span>
                                </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className={`w-full flex items-center justify-between bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all h-9 ${
                                                !servicingState.dispatchDate &&
                                                "text-muted-foreground"
                                            }`}
                                        >
                                            {servicingState.dispatchDate ? (
                                                format(
                                                    new Date(
                                                        servicingState.dispatchDate
                                                    ),
                                                    "PPP"
                                                )
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="h-4 w-4 opacity-50" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={
                                                servicingState.dispatchDate
                                                    ? new Date(
                                                          servicingState.dispatchDate
                                                      )
                                                    : undefined
                                            }
                                            onSelect={(date) => {
                                                setServicingState({
                                                    ...servicingState,
                                                    dispatchDate: date
                                                        ? format(
                                                              date,
                                                              "yyyy-MM-dd"
                                                          )
                                                        : "",
                                                });
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">
                                    Company Name{" "}
                                    <span className="text-destructive">*</span>
                                </label>
                                <Select
                                    value={servicingState.companyId}
                                    onValueChange={(val) =>
                                        setServicingState({
                                            ...servicingState,
                                            companyId: val,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full bg-background/50 border border-input rounded-lg px-3 py-2 text-sm text-foreground outline-none cursor-pointer h-9">
                                        <SelectValue placeholder="Select a company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((comp) => (
                                            <SelectItem
                                                key={comp.id}
                                                value={String(comp.id)}
                                            >
                                                {comp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">
                                    Challan No
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter Challan Number"
                                    value={servicingState.challanNo}
                                    onChange={(e) =>
                                        setServicingState({
                                            ...servicingState,
                                            challanNo: e.target.value,
                                        })
                                    }
                                    className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">
                                    Courier Details
                                </label>
                                <input
                                    type="text"
                                    placeholder="Courier partner, tracking id..."
                                    value={servicingState.courierDetails}
                                    onChange={(e) =>
                                        setServicingState({
                                            ...servicingState,
                                            courierDetails: e.target.value,
                                        })
                                    }
                                    className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <hr className="border-border/60" />

                        {/* Received Items Checklist */}
                        <div>
                            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                                Received Items to Send for Servicing
                            </h3>
                            {servicingState.items.length > 0 ? (
                                <div className="bg-background/40 border border-border p-4 rounded-xl space-y-4 max-h-60 overflow-y-auto">
                                    {servicingState.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="space-y-2 border-b border-border/40 pb-3 last:border-b-0 last:pb-0"
                                        >
                                            <label className="flex items-start gap-3 text-sm text-foreground font-semibold cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        item.sent_for_servicing
                                                    }
                                                    onChange={() => {
                                                        const updated = [
                                                            ...servicingState.items,
                                                        ];
                                                        updated[
                                                            idx
                                                        ].sent_for_servicing =
                                                            !item.sent_for_servicing;
                                                        setServicingState({
                                                            ...servicingState,
                                                            items: updated,
                                                        });
                                                    }}
                                                    className="accent-indigo-600 h-4 w-4 mt-0.5"
                                                />
                                                <div>
                                                    <span>
                                                        {item.item_name}
                                                    </span>
                                                    {item.item_description && (
                                                        <p className="text-xs text-muted-foreground font-normal italic">
                                                            Intake Note:{" "}
                                                            {
                                                                item.item_description
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </label>

                                            {item.sent_for_servicing && (
                                                <div className="pl-7 space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                                                        Servicing Problem
                                                        Details
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Describe problem details for servicing..."
                                                        value={
                                                            item.servicing_problem_description
                                                        }
                                                        onChange={(e) => {
                                                            const updated = [
                                                                ...servicingState.items,
                                                            ];
                                                            updated[
                                                                idx
                                                            ].servicing_problem_description =
                                                                e.target.value;
                                                            setServicingState({
                                                                ...servicingState,
                                                                items: updated,
                                                            });
                                                        }}
                                                        className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic bg-accent/5 p-3 rounded-lg border border-dashed text-center">
                                    No items were registered with this device.
                                </p>
                            )}
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button
                                type="button"
                                onClick={() =>
                                    setModalOpen("sendServicing", false)
                                }
                                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <Button
                                type="submit"
                                disabled={actionLoading.submitting}
                                className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md shadow-cyan-500/10 cursor-pointer transition-all"
                            >
                                {actionLoading.submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Send for Servicing</span>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {activeRequest && (
                <div
                    id="print-receipt-overlay"
                    className="hidden font-sans p-8 text-black bg-white max-w-200 mx-auto"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-wider">
                                Service Portal
                            </h1>
                            <p className="text-xs text-gray-600">
                                Computer & Laptop Repair Registry
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Receipt Date: {new Date().toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-lg font-bold">
                                INTAKE RECEIPT
                            </h2>
                            <p className="font-mono text-sm">
                                TICKET: #SR-
                                {String(activeRequest.id).padStart(6, "0")}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-1">
                                Status:{" "}
                                <strong className="uppercase">
                                    {activeRequest.status}
                                </strong>
                            </p>
                        </div>
                    </div>

                    {/* Customer & Device details */}
                    <div className="grid grid-cols-2 gap-8 mb-6 border-b pb-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b pb-1">
                                CUSTOMER INFORMATION
                            </h3>
                            <p className="text-sm font-bold">
                                {activeRequest.customer_name}
                            </p>
                            <p className="text-xs mt-1">
                                <strong>Phone:</strong>{" "}
                                {activeRequest.customer_mobile}
                            </p>
                            <p className="text-xs mt-1 whitespace-pre-wrap">
                                <strong>Address:</strong>{" "}
                                {activeRequest.customer_address}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b pb-1">
                                DEVICE INTAKE DETAILS
                            </h3>
                            <p className="text-sm font-bold">
                                {activeRequest.brand_model} (
                                {activeRequest.device_type})
                            </p>
                            <p className="text-xs mt-1">
                                <strong>Serial No:</strong>{" "}
                                {activeRequest.serial_number || "N/A"}
                            </p>
                            <p className="text-xs mt-1">
                                <strong>Fault description:</strong>{" "}
                                {activeRequest.problem_description || "N/A"}
                            </p>
                        </div>
                    </div>

                    {/* Items Checklist Table */}
                    <div className="mb-8">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                            CHECKLIST OF ITEMS RECEIVED
                        </h3>
                        <table className="min-w-full text-xs text-left border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-300">
                                    <th className="px-4 py-2 border-r border-gray-300 w-1/3 font-bold">
                                        Item Name
                                    </th>
                                    <th className="px-4 py-2 border-r border-gray-300 font-bold">
                                        Specifications / Condition / Serial
                                    </th>
                                    <th className="px-4 py-2 font-bold text-center w-1/6">
                                        Warranty
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRequest.items &&
                                activeRequest.items.length > 0 ? (
                                    activeRequest.items.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-gray-300"
                                        >
                                            <td className="px-4 py-2 border-r border-gray-300 font-semibold">
                                                {item.item_name}
                                            </td>
                                            <td className="px-4 py-2 border-r border-gray-300 text-gray-700">
                                                {item.item_description ||
                                                    "Verified received"}
                                            </td>
                                            <td
                                                className={`px-4 py-2 text-center font-bold ${
                                                    item.is_warranty === 1 ||
                                                    item.is_warranty === true ||
                                                    String(item.is_warranty) ===
                                                        "1" ||
                                                    String(item.is_warranty) ===
                                                        "true"
                                                        ? "text-emerald-600"
                                                        : "text-rose-600"
                                                }`}
                                            >
                                                {item.is_warranty === 1 ||
                                                item.is_warranty === true ||
                                                String(item.is_warranty) ===
                                                    "1" ||
                                                String(item.is_warranty) ===
                                                    "true"
                                                    ? "Yes"
                                                    : "No"}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-4 py-4 text-center text-gray-500 italic"
                                        >
                                            No standalone accessories or
                                            chargers registered.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Signatures and Agreement details */}
                    <div className="space-y-6 mt-12 border-t pt-6 text-[10px] text-gray-600">
                        <p className="leading-relaxed">
                            <strong>Agreement Terms:</strong> By signing below,
                            the customer acknowledges that the items listed
                            above have been physically left with the Service
                            Portal for diagnosis and repair. The customer
                            declares that any existing cosmetic damage, data
                            loss risk, and software/hardware failure is not the
                            liability of the service portal during repair
                            trials. Estimated diagnostic reports will be
                            communicated.
                        </p>
                        <div className="grid grid-cols-2 gap-12 pt-6">
                            <div className="border-t border-black pt-2 text-center">
                                <p className="font-semibold text-gray-800">
                                    Customer Signature
                                </p>
                            </div>
                            <div className="border-t border-black pt-2 text-center">
                                <p className="font-semibold text-gray-800">
                                    Authorized Receiver Signature
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
