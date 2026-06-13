import React, { useState, useEffect } from "react";
import { Send, Eye, ArrowLeft, Loader2, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiService from "../utils/apiService";
import PaginationTable from "./PaginationTable";
import type { Column } from "./PaginationTable";

interface ServicingTabProps {
    companies: any[];
    data: any[];
    handleOpenDetails: (id: number) => void;
}

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

const ServicingTab: React.FC<ServicingTabProps> = ({
    companies,
    data,
    handleOpenDetails,
}) => {
    const [subTab, setSubTab] = useState<"Servicing" | "Completed">("Servicing");
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Sub-view pagination, search, and sorting state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        sortBy: "created_at",
        sortOrder: "desc" as "asc" | "desc",
        search: "",
    });

    const fetchCompanyProducts = async () => {
        if (!selectedCompany) return;
        setLoadingProducts(true);
        try {
            const response = await apiService.get("/api/v1/service-requests", {
                params: {
                    companyId: selectedCompany.id,
                    status: "servicing_all",
                    servicingStatus: subTab,
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
        } catch (error) {
            console.error("Failed to load company products:", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Trigger fetch when selected company, page parameters, subTab, or parent data changes
    useEffect(() => {
        if (selectedCompany) {
            fetchCompanyProducts();
        }
    }, [
        selectedCompany,
        subTab,
        pagination.currentPage,
        pagination.rowsPerPage,
        pagination.sortBy,
        pagination.sortOrder,
        pagination.search,
        data,
    ]);

    // Reset pagination when changing selected company
    const handleSelectCompany = (company: any) => {
        setPagination({
            currentPage: 1,
            totalPages: 1,
            rowsPerPage: 10,
            sortBy: "created_at",
            sortOrder: "desc",
            search: "",
        });
        setSelectedCompany(company);
    };

    if (selectedCompany) {
        // Define columns for company products pagination table
        const columns: Column[] = [
            { key: "id", header: "ID", isShortable: true, width: 60 },
            { key: "brand_model", header: "Product / Model", isShortable: true, width: 180 },
            { key: "serial_number", header: "Serial Number", isShortable: true, width: 140 },
            { key: "customer_name", header: "Customer Name", isShortable: true, width: 150 },
            { key: "status_badge", header: "Status", width: 120 },
            { key: "dispatch_date_formatted", header: "Dispatch Date", isShortable: true, width: 120 },
            { key: "actions", header: "Actions", width: 80 },
        ];

        // Format data to match pagination table rows
        const tableData = products.map((sr) => ({
            ...sr,
            dispatch_date_formatted: sr.dispatch_date
                ? new Date(sr.dispatch_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                  })
                : "N/A",
            status_badge: (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(sr.status)}`}>
                    {sr.status}
                </span>
            ),
            actions: (
                <div className="flex justify-center items-center">
                    <button
                        onClick={() => handleOpenDetails(sr.id)}
                        className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 cursor-pointer"
                        title="View Details"
                        type="button"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        }));

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedCompany(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
                        type="button"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to Companies</span>
                    </button>
                </div>

                {/* Sub-tab selection bar inside subview */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => {
                            setSubTab("Servicing");
                            setPagination((prev) => ({ ...prev, currentPage: 1 }));
                        }}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                            subTab === "Servicing"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                        type="button"
                    >
                        Active Servicing
                    </button>
                    <button
                        onClick={() => {
                            setSubTab("Completed");
                            setPagination((prev) => ({ ...prev, currentPage: 1 }));
                        }}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                            subTab === "Completed"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                        type="button"
                    >
                        Completed / History
                    </button>
                </div>

                <div className="relative bg-card/45 border border-border/80 rounded-xl p-4 sm:p-6 backdrop-blur-md shadow-xl overflow-hidden">
                    {loadingProducts && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-20">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <span className="text-xs text-muted-foreground font-semibold">
                                    Loading Dispatched Products...
                                </span>
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={subTab}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                        >
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
                                        sortBy: key,
                                        sortOrder: dir,
                                    }));
                                }}
                                title={
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-cyan-500" />
                                        <span className="font-bold text-foreground">
                                            {subTab === "Servicing" ? "Active Servicing" : "Completed Servicing"} - {selectedCompany.name}
                                        </span>
                                    </div>
                                }
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sub-tab selection bar inside main view */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setSubTab("Servicing")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                        subTab === "Servicing"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    type="button"
                >
                    Active Servicing
                </button>
                <button
                    onClick={() => setSubTab("Completed")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                        subTab === "Completed"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    type="button"
                >
                    Completed / History
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={subTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-x-auto border border-border rounded-xl"
                >
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border text-foreground font-semibold">
                                <th className="p-4 text-xs uppercase tracking-wider">Company Details</th>
                                <th className="p-4 text-xs uppercase tracking-wider text-center">
                                    {subTab === "Servicing" ? "Active Servicing" : "Completed Servicing"}
                                </th>
                                <th className="p-4 text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {companies.map((company) => {
                                const companyRequests = data.filter(
                                    (sr) => sr.servicing_company_id === company.id
                                );
                                const count = companyRequests.filter((sr) => {
                                    const isServicing = sr.servicing_status === "Servicing" || sr.status === "Servicing";
                                    return subTab === "Servicing" ? isServicing : !isServicing;
                                }).length;

                                return (
                                    <tr key={company.id} className="hover:bg-muted/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                                                    <Send className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{company.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{company.address || "No address details"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-full border ${
                                                subTab === "Servicing"
                                                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25"
                                                    : "bg-muted text-foreground border-border"
                                            }`}>
                                                {count}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleSelectCompany(company)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors border border-indigo-500/10"
                                                type="button"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>View Products ({count})</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ServicingTab;
