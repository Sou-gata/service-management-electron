import React, { useState, useEffect } from "react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { ServiceDetailsDialog } from "../components/ServiceDetailsDialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog";
import { Loader2, Eye, Layers, Plus, X, Check } from "lucide-react";
import PaginationTable from "../components/PaginationTable";
import type { Column } from "../components/PaginationTable";

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
    estimated_cost?: number | string | null;
    estimated_delivery_date?: string | null;
}

const CompletedServicing: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [products, setProducts] = useState<ServiceRequest[]>([]);
    const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);

    const [modals, setModals] = useState({
        details: false,
        delivery: false,
    });

    const [actionLoading, setActionLoading] = useState({
        downloadingPdf: false,
        submittingDelivery: false,
    });

    const [deliveryState, setDeliveryState] = useState({
        requestId: null as number | null,
        previousStatus: "",
        cost: "",
        estimatedCost: "" as string | number | null,
        isSolved: true,
        intakeItems: [] as any[],
        returnedItems: [] as string[],
        newParts: [] as any[],
        isEditModalSource: false,
    });

    // Pagination, search, and sorting state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        sortBy: "dispatch_date",
        sortOrder: "desc" as "asc" | "desc",
        search: "",
    });

    const setModalOpen = (modal: keyof typeof modals, open: boolean) => {
        setModals((prev) => ({ ...prev, [modal]: open }));
    };

    const fetchConfigData = async () => {
        try {
            const compRes = await apiService.get("/api/v1/companies");
            setCompanies(compRes.data || compRes);
        } catch (error: any) {
            console.error("Failed to fetch companies:", error);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await apiService.get("/api/v1/service-requests", {
                params: {
                    status: "Completed",
                    search: pagination.search,
                    page: pagination.currentPage,
                    limit: pagination.rowsPerPage,
                    sortBy: pagination.sortBy,
                    sortOrder: pagination.sortOrder,
                },
            });
            const resData = response.data || response;
            setProducts(resData.serviceRequests || []);
            setPagination((prev) => ({
                ...prev,
                totalPages: resData.pagination?.totalPages || 1,
            }));
        } catch (error: any) {
            console.error("Failed to load completed servicing registrations:", error);
            toaster("error", "Failed to load registrations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigData();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [
        pagination.currentPage,
        pagination.rowsPerPage,
        pagination.sortBy,
        pagination.sortOrder,
        pagination.search,
    ]);

    const fetchRequestDetails = async (id: number) => {
        try {
            const response = await apiService.get(`/api/v1/service-requests/${id}`);
            return response.data || response;
        } catch (error: any) {
            console.error("Failed to fetch request details:", error);
            toaster("error", "Failed to retrieve intake details.");
            return null;
        }
    };

    const handleOpenDetails = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            setActiveRequest(details);
            setModalOpen("details", true);
        }
    };

    const handleOpenDeliver = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            const intakeItems = details.items || [];
            setDeliveryState({
                requestId: details.id,
                previousStatus: details.status,
                cost: "",
                estimatedCost: details.estimated_cost,
                isSolved: details.is_solved === 1 || details.is_solved === true,
                intakeItems: intakeItems,
                returnedItems: intakeItems.map((item: any) => item.item_name),
                newParts: [],
                isEditModalSource: false,
            });
            setModalOpen("delivery", true);
        }
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

    const handleDeliverySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deliveryState.requestId) return;

        setActionLoading((prev) => ({ ...prev, submittingDelivery: true }));
        try {
            await apiService.patch(
                `/api/v1/service-requests/${deliveryState.requestId}/status`,
                {
                    status: "Delivered",
                    cost: deliveryState.cost ? parseFloat(deliveryState.cost) : null,
                    is_solved: deliveryState.isSolved,
                    returned_items: deliveryState.returnedItems,
                    new_parts: deliveryState.newParts,
                }
            );

            toaster("success", "Device successfully marked as Delivered!");
            setModalOpen("delivery", false);
            fetchProducts();
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

    const getStatusColor = (status: string) => {
        const STATUS_OPTIONS = [
            {
                value: "Received",
                color: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
            },
            {
                value: "Inspected",
                color: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400",
            },
            {
                value: "Servicing",
                color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400",
            },
            {
                value: "Repaired",
                color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
            },
            {
                value: "Unrepairable",
                color: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400",
            },
            {
                value: "Delivered",
                color: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-400",
            },
        ];
        const match = STATUS_OPTIONS.find((opt) => opt.value === status);
        return match ? match.color : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
    };

    const columns: Column[] = [
        {
            key: "brand_model",
            header: "Product / Model",
            isShortable: true,
            width: 180,
        },
        {
            key: "estimated_cost_formatted",
            header: "Estimated Cost",
            width: 120,
        },
        { key: "company_name", header: "Company Name", width: 150 },
        {
            key: "customer_name",
            header: "Customer Name",
            isShortable: true,
            width: 150,
        },
        { key: "status_badge", header: "Status", width: 120 },
        {
            key: "dispatch_date_formatted",
            header: "Dispatch Date",
            isShortable: true,
            width: 120,
        },
        { key: "actions", header: "Actions", width: 80 },
    ];

    const tableData = products.map((sr) => {
        const company = companies.find((c) => c.id === sr.servicing_company_id);
        return {
            ...sr,
            company_name: company ? company.name : "N/A",
            estimated_cost_formatted:
                sr.estimated_cost !== null &&
                sr.estimated_cost !== undefined &&
                String(sr.estimated_cost).trim() !== ""
                    ? `₹${parseFloat(String(sr.estimated_cost)).toFixed(2)}`
                    : "N/A",
            dispatch_date_formatted: sr.dispatch_date
                ? new Date(sr.dispatch_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                  })
                : "N/A",
            status_badge: (
                <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(sr.status)}`}
                >
                    {sr.status}
                </span>
            ),
            actions: (
                <div className="flex justify-center items-center gap-1.5">
                    <button
                        onClick={() => handleOpenDetails(sr.id)}
                        className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 cursor-pointer"
                        title="View Details"
                        type="button"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => handleOpenDeliver(sr.id)}
                        className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 cursor-pointer"
                        title="Mark as Delivered"
                        type="button"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        };
    });

    return (
        <div className="space-y-6">
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-20">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <span className="text-xs text-muted-foreground font-semibold">
                                Loading Completed Registry...
                            </span>
                        </div>
                    </div>
                )}

                <div className="relative bg-card/45 border border-border/80 rounded-xl p-4 sm:p-6 backdrop-blur-md shadow-xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex-1 max-w-sm relative">
                            <input
                                type="text"
                                placeholder="Search products, customer, S/N..."
                                value={pagination.search}
                                onChange={(e) =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        search: e.target.value,
                                        currentPage: 1,
                                    }))
                                }
                                className="w-full bg-background border border-input rounded-lg py-2 px-3 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 hover:border-border transition-all"
                            />
                        </div>
                    </div>

                    <PaginationTable
                        columns={columns}
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
                                currentPage: 1,
                            }))
                        }
                        onSort={(key, dir) => {
                            setPagination((prev) => ({
                                ...prev,
                                sortBy: key === "dispatch_date_formatted" ? "dispatch_date" : key,
                                sortOrder: dir,
                            }));
                        }}
                        title={
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-emerald-500" />
                                <span className="font-bold text-foreground">
                                    Completed Servicing
                                </span>
                            </div>
                        }
                    />
                </div>
            </div>

            {/* DETAILS VIEW / PHYSICAL RECEIPT MODAL */}
            <ServiceDetailsDialog
                isOpen={modals.details}
                onClose={() => setModalOpen("details", false)}
                activeRequest={activeRequest}
                companies={companies}
                getStatusColor={getStatusColor}
                downloadingPdf={actionLoading.downloadingPdf}
                handleDownloadPdf={handleDownloadPdf}
                onCompleteClick={() => {}}
                onDeliverClick={() => {
                    if (!activeRequest) return;
                    const intakeItems = activeRequest.items || [];
                    setDeliveryState({
                        requestId: activeRequest.id,
                        previousStatus: activeRequest.status,
                        cost: "",
                        estimatedCost: activeRequest.estimated_cost,
                        isSolved: activeRequest.is_solved === 1 || activeRequest.is_solved === true,
                        intakeItems: intakeItems,
                        returnedItems: intakeItems.map((item: any) => item.item_name),
                        newParts: [],
                        isEditModalSource: false,
                    });
                    setModalOpen("details", false);
                    setModalOpen("delivery", true);
                }}
            />

            {/* DELIVERY DETAILS MODAL */}
            <Dialog
                open={modals.delivery}
                onOpenChange={(open) => {
                    if (!open) setModalOpen("delivery", false);
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
                                    Specify cost, returned accessories, and parts replaced
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
                                <label className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                                    <span>Total Service Cost (₹)</span>
                                    {deliveryState.estimatedCost !== null &&
                                        deliveryState.estimatedCost !== undefined &&
                                        String(deliveryState.estimatedCost).trim() !== "" && (
                                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold normal-case">
                                                Estimated Cost: ₹{parseFloat(String(deliveryState.estimatedCost)).toFixed(2)}
                                            </span>
                                        )}
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
                                            checked={deliveryState.isSolved === true}
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
                                            checked={deliveryState.isSolved === false}
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
                                    {deliveryState.intakeItems.map((item, idx) => {
                                        const isChecked = deliveryState.returnedItems.includes(item.item_name);
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
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                returnedItems: deliveryState.returnedItems.filter((i) => i !== item.item_name),
                                                            });
                                                        } else {
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                returnedItems: [...deliveryState.returnedItems, item.item_name],
                                                            });
                                                        }
                                                    }}
                                                    className="accent-indigo-600 h-4 w-4 mt-0.5"
                                                />
                                                <div>
                                                    <span>{item.item_name}</span>
                                                    {item.item_description && (
                                                        <p className="text-xs text-muted-foreground font-normal italic">
                                                            Note: {item.item_description}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic bg-accent/5 p-3 rounded-lg border border-dashed text-center">
                                    No accessories were registered with this device intake.
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
                                                { name: "", serial: "", brand: "", cost: "" },
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
                                    {deliveryState.newParts.map((part, partIdx) => (
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
                                                            newParts: deliveryState.newParts.filter((_, i) => i !== partIdx),
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
                                                            const updated = [...deliveryState.newParts];
                                                            updated[partIdx].name = e.target.value;
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                newParts: updated,
                                                            });
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
                                                            const updated = [...deliveryState.newParts];
                                                            updated[partIdx].brand = e.target.value;
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                newParts: updated,
                                                            });
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
                                                            const updated = [...deliveryState.newParts];
                                                            updated[partIdx].serial = e.target.value;
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                newParts: updated,
                                                            });
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
                                                        placeholder="e.g. 80.00"
                                                        value={part.cost}
                                                        onChange={(e) => {
                                                            const updated = [...deliveryState.newParts];
                                                            updated[partIdx].cost = e.target.value;
                                                            setDeliveryState({
                                                                ...deliveryState,
                                                                newParts: updated,
                                                            });
                                                        }}
                                                        className="w-full bg-background border border-input rounded px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic bg-accent/5 p-3 rounded-lg border border-dashed text-center">
                                    No replaced parts added yet. Click "Add Part" to document any materials.
                                </p>
                            )}
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setModalOpen("delivery", false)}
                                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading.submittingDelivery}
                                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer transition-all border border-emerald-600 disabled:opacity-50"
                            >
                                {actionLoading.submittingDelivery ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Complete Delivery</span>
                                )}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompletedServicing;
