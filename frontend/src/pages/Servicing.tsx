import React, { useState, useEffect } from "react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { ServiceDetailsDialog } from "../components/ServiceDetailsDialog";
import { CompleteConfirmDialog } from "../components/CompleteConfirmDialog";
import { Loader2, Eye, Layers, Check } from "lucide-react";
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

const Servicing: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [products, setProducts] = useState<ServiceRequest[]>([]);
    const [completeIsSolved, setCompleteIsSolved] = useState(true);
    const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);

    const [modals, setModals] = useState({
        details: false,
        completeConfirm: false,
    });

    const [actionLoading, setActionLoading] = useState({
        submitting: false,
        downloadingPdf: false,
    });

    // Pagination, search, and sorting state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        sortBy: "created_at",
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
                    status: "servicing_all",
                    servicingStatus: "Servicing",
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
            console.error("Failed to load servicing registrations:", error);
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

    const handleOpenComplete = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            setActiveRequest(details);
            setCompleteIsSolved(true);
            setModalOpen("completeConfirm", true);
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
            fetchProducts();
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
                        onClick={() => handleOpenComplete(sr.id)}
                        className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 cursor-pointer"
                        title="Mark as Complete"
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
                                Loading Servicing Registry...
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
                                <Layers className="h-4 w-4 text-cyan-500" />
                                <span className="font-bold text-foreground">
                                    Active Servicing
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
                onCompleteClick={() => {
                    setCompleteIsSolved(true);
                    setModalOpen("details", false);
                    setModalOpen("completeConfirm", true);
                }}
            />

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
                    setModalOpen("details", true);
                }}
            />
        </div>
    );
};

export default Servicing;
