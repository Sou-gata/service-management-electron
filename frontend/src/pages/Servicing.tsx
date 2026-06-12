import React, { useState, useEffect } from "react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import ServicingTab from "../components/ServicingTab";
import { ServiceDetailsDialog } from "../components/ServiceDetailsDialog";
import { CompleteConfirmDialog } from "../components/CompleteConfirmDialog";
import { Loader2 } from "lucide-react";

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

const Servicing: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [data, setData] = useState<ServiceRequest[]>([]);
    const [completeIsSolved, setCompleteIsSolved] = useState(true);
    const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(
        null
    );

    const [modals, setModals] = useState({
        details: false,
        completeConfirm: false,
        delivery: false,
    });

    const [actionLoading, setActionLoading] = useState({
        submitting: false,
        submittingDelivery: false,
        downloadingPdf: false,
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

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await apiService.get("/api/v1/service-requests", {
                params: {
                    status: "servicing_all",
                    page: 1,
                    limit: 1000,
                    sortBy: "created_at",
                    sortOrder: "desc",
                },
            });
            const resData = response.data || response;
            setData(resData.serviceRequests || []);
        } catch (error: any) {
            console.error("Failed to load servicing registrations:", error);
            toaster("error", "Failed to load registrations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigData();
        fetchRequests();
    }, []);

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

    const handleOpenDetails = async (reqId: number) => {
        setLoading(true);
        const details = await fetchRequestDetails(reqId);
        setLoading(false);
        if (details) {
            setActiveRequest(details);
            setModalOpen("details", true);
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
        return match ? match.color : "bg-zinc-500/10 text-zinc-600";
    };

    return (
        <div className="space-y-6">
            <div className="relative bg-card/45 border border-border/80 rounded-xl p-4 sm:p-6 backdrop-blur-md shadow-xl">
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
                <ServicingTab
                    companies={companies}
                    data={data}
                    handleOpenDetails={handleOpenDetails}
                />
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
