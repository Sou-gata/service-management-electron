import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import {
    Info,
    Calendar as CalendarIcon,
    User,
    Phone,
    MapPin,
    Laptop,
    Layers,
    Loader2,
    Copy,
    Printer,
} from "lucide-react";
import { getStatusMessage } from "../utils/messageTemplates";
import toaster from "../utils/toaster";
import baseURL from "../utils/baseURL";

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
    is_warranty?: number | boolean | null;
    delivery_date?: string | null;
    estimated_cost?: number | string | null;
    estimated_delivery_date?: string | null;
}

interface ServiceDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    activeRequest: ServiceRequest | null;
    companies: any[];
    getStatusColor: (status: string) => string;
    downloadingPdf: boolean;
    handleDownloadPdf: (id: number) => void;
    onCompleteClick: () => void;
    onDeliverClick?: () => void;
}

export const ServiceDetailsDialog: React.FC<ServiceDetailsDialogProps> = ({
    isOpen,
    onClose,
    activeRequest,
    companies,
    getStatusColor,
    downloadingPdf,
    handleDownloadPdf,
    onCompleteClick,
    onDeliverClick,
}) => {
    if (!activeRequest) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                unbounded
                className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border shadow-2xl rounded-xl no-print"
            >
                {/* Header */}
                <DialogHeader className="bg-accent/10 -mx-6 -mt-6 p-6 border-b border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Info className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Intake Registry Details (ID: #{activeRequest.id}
                                )
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                View customer details, device specifications,
                                and intake items
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="mr-8">
                        <button
                            onClick={() => handleDownloadPdf(activeRequest.id)}
                            disabled={downloadingPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                        >
                            {downloadingPdf ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Printing...</span>
                                </>
                            ) : (
                                <>
                                    <Printer className="h-3.5 w-3.5" />
                                    <span>
                                        {activeRequest.status === "Servicing"
                                            ? "Print Dispatch Challan"
                                            : activeRequest.status === "Delivered"
                                            ? "Print Delivery Receipt"
                                            : "Print Intake Receipt"}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="space-y-6 text-sm mt-4">
                    {/* Summary Row */}
                    <div className="flex justify-between items-center border-b pb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Status:
                            </span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(
                                    activeRequest.status
                                )}`}
                            >
                                {activeRequest.status}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    let actualCost: string | undefined = undefined;
                                    if (activeRequest.status === "Delivered") {
                                        const laborFee = parseFloat(
                                            String((activeRequest as any).cost || 0)
                                        );
                                        let partsTotal = 0;
                                        if (Array.isArray((activeRequest as any).new_parts)) {
                                            (activeRequest as any).new_parts.forEach((p: any) => {
                                                const c = parseFloat(p.cost);
                                                if (!isNaN(c)) {
                                                    partsTotal += c;
                                                }
                                            });
                                        }
                                        actualCost = (laborFee + partsTotal).toFixed(2);
                                    }

                                    const msg = getStatusMessage(
                                        activeRequest.status,
                                        {
                                            customerName:
                                                activeRequest.customer_name,
                                            ticketId: String(
                                                activeRequest.id
                                            ).padStart(6, "0"),
                                            brandModel:
                                                activeRequest.brand_model,
                                            status: activeRequest.status,
                                            estimatedCost: activeRequest.estimated_cost && String(activeRequest.estimated_cost).trim() !== ""
                                                ? parseFloat(String(activeRequest.estimated_cost)).toFixed(2)
                                                : undefined,
                                            actualCost,
                                        }
                                    );
                                    navigator.clipboard.writeText(msg);
                                    toaster(
                                        "success",
                                        "Message template copied to clipboard!"
                                    );
                                }}
                                className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-semibold cursor-pointer transition-all"
                                title="Copy customer update message template"
                            >
                                <Copy className="h-3 w-3" />
                                <span>Copy Message</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>
                                Registered on{" "}
                                {new Date(
                                    activeRequest.created_at.endsWith("Z")
                                        ? activeRequest.created_at
                                        : activeRequest.created_at.replace(
                                              " ",
                                              "T"
                                          ) + "Z"
                                ).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Customer Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                Customer Details
                            </h3>

                            <div className="flex items-start gap-2.5">
                                <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Name
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.customer_name}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Mobile Number
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.customer_mobile}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Address
                                    </p>
                                    <p className="text-foreground/90 whitespace-pre-wrap">
                                        {activeRequest.customer_address}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Device Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                Device Details
                            </h3>

                            <div className="flex items-start gap-2.5">
                                <Laptop className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Device Model
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.brand_model} (
                                        {activeRequest.device_type})
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Serial Number (S/N)
                                    </p>
                                    <p className="font-mono text-xs font-semibold text-foreground">
                                        {activeRequest.serial_number || "N/A"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Has Warranty?
                                    </p>
                                    <div className="mt-0.5">
                                        {activeRequest.is_warranty === 1 ||
                                        activeRequest.is_warranty === true ? (
                                            <span className="inline-block text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-block text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">
                                                No
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {activeRequest.estimated_cost !== null &&
                                activeRequest.estimated_cost !== undefined &&
                                String(activeRequest.estimated_cost).trim() !== "" && (
                                    <div className="flex items-start gap-2.5">
                                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                Estimated Cost
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                ₹{parseFloat(String(activeRequest.estimated_cost)).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                            {activeRequest.estimated_delivery_date &&
                                String(activeRequest.estimated_delivery_date).trim() !== "" && (
                                    <div className="flex items-start gap-2.5">
                                        <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                Estimated Delivery Date
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                {new Date(
                                                    activeRequest.estimated_delivery_date.endsWith("Z")
                                                        ? activeRequest.estimated_delivery_date
                                                        : activeRequest.estimated_delivery_date.replace(
                                                              " ",
                                                              "T"
                                                          ) + "Z"
                                                ).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}


                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                                    Problem Description
                                </p>
                                <p className="text-foreground bg-accent/20 border p-2.5 rounded-lg text-xs min-h-15 whitespace-pre-wrap">
                                    {activeRequest.problem_description ||
                                        "No specific defect commented."}
                                </p>
                            </div>

                            {activeRequest.product_image && (
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
                                        Device Condition Image
                                    </p>
                                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/40 max-w-full aspect-video flex items-center justify-center group shadow-inner">
                                        <img
                                            src={`${baseURL}/uploads/${activeRequest.product_image}`}
                                            alt="Product intake condition"
                                            className="object-contain max-h-48 w-full h-full cursor-zoom-in hover:scale-[1.02] transition-transform duration-200"
                                            onClick={() => {
                                                window.open(
                                                    `${baseURL}/uploads/${activeRequest.product_image}`,
                                                    "_blank"
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Associated Items */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            <span>
                                Intake checklist items (
                                {activeRequest.items?.length || 0})
                            </span>
                        </h3>

                        {activeRequest.items &&
                        activeRequest.items.length > 0 ? (
                            <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
                                <table className="min-w-full text-xs text-left">
                                    <thead className="bg-muted/40 font-bold text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 w-1/4 border-r">
                                                Item Name
                                            </th>
                                            <th className="px-4 py-2 w-1/3 border-r">
                                                Item Specifications / Serial /
                                                Notes
                                            </th>
                                            <th className="px-4 py-2 w-1/6 border-r">
                                                Warranty
                                            </th>
                                            <th className="px-4 py-2">
                                                Servicing Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {activeRequest.items.map(
                                            (item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2.5 font-semibold text-foreground border-r">
                                                        {item.item_name}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-muted-foreground border-r">
                                                        {item.item_description || (
                                                            <span className="italic text-muted-foreground/60">
                                                                No serial/note
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 border-r">
                                                        {item.is_warranty ===
                                                            1 ||
                                                        item.is_warranty ===
                                                            true ||
                                                        String(
                                                            item.is_warranty
                                                        ) === "1" ||
                                                        String(
                                                            item.is_warranty
                                                        ) === "true" ? (
                                                            <span className="inline-block text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                                                                Yes
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">
                                                                No
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {item.sent_for_servicing ===
                                                            1 ||
                                                        item.sent_for_servicing ===
                                                            true ? (
                                                            <div className="space-y-1">
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                                                                    Sent for
                                                                    Servicing
                                                                </span>
                                                                {item.servicing_problem_description && (
                                                                    <p className="text-xs text-foreground font-medium">
                                                                        Problem:{" "}
                                                                        {
                                                                            item.servicing_problem_description
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                Not sent
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 border border-dashed rounded-xl text-xs text-muted-foreground italic bg-accent/5">
                                No standalone items or chargers registered with
                                this device.
                            </div>
                        )}
                    </div>

                    {/* Servicing Details Section */}
                    {activeRequest.is_sent_for_servicing === 1 && (
                        <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl space-y-3">
                            <h3 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                                Servicing Dispatch Details
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Dispatch Date
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.dispatch_date
                                            ? new Date(
                                                  activeRequest.dispatch_date
                                              ).toLocaleDateString("en-US", {
                                                  year: "numeric",
                                                  month: "short",
                                                  day: "numeric",
                                              })
                                            : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Servicing Company
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {companies.find(
                                            (c) =>
                                                c.id ===
                                                activeRequest.servicing_company_id
                                        )?.name || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Challan No
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.challan_no || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Courier Details
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.courier_details || "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delivery Details Section */}
                    {activeRequest.status === "Delivered" && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-3">
                            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Delivery Details
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Problem Solved
                                    </p>
                                    <p className="font-semibold text-foreground">
                                        {activeRequest.is_solved === 1 ||
                                        activeRequest.is_solved === true
                                            ? "✅ Yes, Solved"
                                            : "❌ No, Unsolved"}
                                    </p>
                                </div>
                                {activeRequest.delivery_date && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            Delivery Date
                                        </p>
                                        <p className="font-semibold text-foreground">
                                            {new Date(
                                                activeRequest.delivery_date.endsWith(
                                                    "Z"
                                                )
                                                    ? activeRequest.delivery_date
                                                    : activeRequest.delivery_date.replace(
                                                          " ",
                                                          "T"
                                                      ) + "Z"
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {(() => {
                                const laborFee = parseFloat(
                                    String((activeRequest as any).cost || 0)
                                );
                                let partsTotal = 0;
                                if (
                                    Array.isArray(
                                        (activeRequest as any).new_parts
                                    )
                                ) {
                                    (activeRequest as any).new_parts.forEach(
                                        (p: any) => {
                                            const c = parseFloat(p.cost);
                                            if (!isNaN(c)) {
                                                partsTotal += c;
                                            }
                                        }
                                    );
                                }
                                const grandTotal = laborFee + partsTotal;

                                return (
                                    <div className="grid grid-cols-3 gap-4 text-xs pt-3 border-t border-emerald-500/10">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                Labor Fee
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                ₹{laborFee.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                Parts Total
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                ₹{partsTotal.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-emerald-500/10 -m-1 p-1 px-2 rounded-lg border border-emerald-500/20">
                                            <p className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider">
                                                Grand Total
                                            </p>
                                            <p className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                                                ₹{grandTotal.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Returned Items */}
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                                    Accessories Returned
                                </p>
                                {Array.isArray(
                                    (activeRequest as any).returned_items
                                ) &&
                                (activeRequest as any).returned_items.length >
                                    0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(
                                            activeRequest as any
                                        ).returned_items.map(
                                            (item: string, idx: number) => (
                                                <span
                                                    key={idx}
                                                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-500/10"
                                                >
                                                    {item}
                                                </span>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        No accessories returned (or none
                                        registered).
                                    </p>
                                )}
                            </div>

                            {/* Replaced Parts */}
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
                                    Replaced Parts
                                </p>
                                {Array.isArray(
                                    (activeRequest as any).new_parts
                                ) &&
                                (activeRequest as any).new_parts.length > 0 ? (
                                    <div className="border border-border/80 rounded-lg overflow-hidden bg-background/50 text-xs">
                                        <table className="min-w-full text-left">
                                            <thead className="bg-muted/40 font-bold text-muted-foreground text-[10px]">
                                                <tr>
                                                    <th className="px-3 py-1.5 border-r">
                                                        Part
                                                    </th>
                                                    <th className="px-3 py-1.5 border-r">
                                                        Brand
                                                    </th>
                                                    <th className="px-3 py-1.5 border-r">
                                                        Serial
                                                    </th>
                                                    <th className="px-3 py-1.5">
                                                        Cost
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {(
                                                    activeRequest as any
                                                ).new_parts.map(
                                                    (
                                                        part: any,
                                                        idx: number
                                                    ) => (
                                                        <tr key={idx}>
                                                            <td className="px-3 py-1.5 font-semibold text-foreground border-r">
                                                                {part.name ||
                                                                    "N/A"}
                                                            </td>
                                                            <td className="px-3 py-1.5 text-muted-foreground border-r">
                                                                {part.brand ||
                                                                    "N/A"}
                                                            </td>
                                                            <td className="px-3 py-1.5 font-mono text-[11px] text-foreground border-r">
                                                                {part.serial ||
                                                                    "N/A"}
                                                            </td>
                                                            <td className="px-3 py-1.5 font-semibold text-foreground">
                                                                {part.cost !==
                                                                    undefined &&
                                                                part.cost !==
                                                                    null &&
                                                                part.cost !== ""
                                                                    ? `₹${parseFloat(part.cost).toFixed(2)}`
                                                                    : "N/A"}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        No new parts replaced.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer metadata */}
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-4 border-t border-border">
                        <span>
                            Registered by Admin user:{" "}
                            <strong className="text-foreground">
                                {activeRequest.registered_by_user || "System"}
                            </strong>
                        </span>
                        <span>
                            Ticket ID: #SR-
                            {String(activeRequest.id).padStart(6, "0")}
                        </span>
                    </div>

                    {/* Bottom Actions: Complete, Deliver and Close */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                        {activeRequest.status !== "Completed" &&
                            activeRequest.status !== "Delivered" && (
                                <button
                                    type="button"
                                    onClick={onCompleteClick}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer transition-all border border-emerald-600"
                                >
                                    Complete
                                </button>
                            )}
                        {activeRequest.status === "Completed" &&
                            onDeliverClick && (
                                <button
                                    type="button"
                                    onClick={onDeliverClick}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer transition-all border border-indigo-600"
                                >
                                    Deliver
                                </button>
                            )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
