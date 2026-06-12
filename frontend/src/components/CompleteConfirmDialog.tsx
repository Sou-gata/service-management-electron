import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { CheckCircle, Loader2 } from "lucide-react";

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

interface CompleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    activeRequest: ServiceRequest | null;
    completeIsSolved: boolean;
    setCompleteIsSolved: (val: boolean) => void;
    handleCompleteSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
    onCancelClick: () => void;
}

export const CompleteConfirmDialog: React.FC<CompleteConfirmDialogProps> = ({
    isOpen,
    onClose,
    activeRequest,
    completeIsSolved,
    setCompleteIsSolved,
    handleCompleteSubmit,
    submitting,
    onCancelClick,
}) => {
    if (!activeRequest) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                unbounded={true}
                className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border shadow-2xl rounded-xl"
            >
                <DialogHeader className="bg-emerald-500/10 -mx-6 -mt-6 p-6 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Mark Service as Completed
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Review service items and verify if the issue is resolved
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleCompleteSubmit} className="space-y-6 mt-4">
                    {/* Service Items List */}
                    <div>
                        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                            Intake Items / Accessories List
                        </h3>
                        {activeRequest.items && activeRequest.items.length > 0 ? (
                            <div className="bg-background/40 border border-border p-4 rounded-xl space-y-3 max-h-48 overflow-y-auto">
                                {activeRequest.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-col gap-1 text-sm border-b border-border/40 pb-2 last:border-b-0"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground">
                                                {item.item_name}
                                            </span>
                                            {item.sent_for_servicing === 1 ||
                                            item.sent_for_servicing === true ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                                                    Sent for Servicing
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    Not sent
                                                </span>
                                            )}
                                        </div>
                                        {item.item_description && (
                                            <p className="text-xs text-muted-foreground">
                                                Notes: {item.item_description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic bg-accent/5 p-3 rounded-lg border border-dashed text-center">
                                No items registered with this device.
                            </p>
                        )}
                    </div>

                    {/* Solved Status Radio Buttons */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                            Is the problem solved?
                        </label>
                        <div className="flex gap-6 bg-accent/10 p-4 rounded-xl border border-border">
                            <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer">
                                <input
                                    type="radio"
                                    name="complete_is_solved"
                                    checked={completeIsSolved === true}
                                    onChange={() => setCompleteIsSolved(true)}
                                    className="accent-indigo-600 h-4 w-4"
                                />
                                <span>Yes, Solved</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-foreground font-semibold cursor-pointer">
                                <input
                                    type="radio"
                                    name="complete_is_solved"
                                    checked={completeIsSolved === false}
                                    onChange={() => setCompleteIsSolved(false)}
                                    className="accent-indigo-600 h-4 w-4"
                                />
                                <span>No, Unsolved</span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={onCancelClick}
                            className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md shadow-emerald-500/10 cursor-pointer transition-all border border-emerald-500"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Completing...</span>
                                </>
                            ) : (
                                <span>Complete Service</span>
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
