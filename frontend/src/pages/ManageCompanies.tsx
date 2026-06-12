import React, { useState, useEffect } from "react";
import {
    Plus,
    Edit3,
    Eye,
    Loader2,
    Building2,
    Phone,
    MapPin,
    Search,
    Calendar,
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";

interface Company {
    id: number;
    name: string;
    mobile?: string;
    address?: string;
    status: "active" | "inactive";
    created_at?: string;
}

const ManageCompanies: React.FC = () => {
    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user?.role === "admin";

    const [companies, setCompanies] = useState<Company[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form modals state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [activeCompany, setActiveCompany] = useState<Company | null>(null);

    // View modal state
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewCompany, setViewCompany] = useState<Company | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [mobile, setMobile] = useState("");
    const [address, setAddress] = useState("");
    const [status, setStatus] = useState<"active" | "inactive">("active");

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await apiService.get("/api/v1/companies");
            setCompanies(res.data || res);
        } catch (error: any) {
            console.error("Failed to load companies:", error);
            toaster("error", "Failed to load companies from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const openModal = (mode: "add" | "edit", company?: Company) => {
        setModalMode(mode);
        if (mode === "edit" && company) {
            setActiveCompany(company);
            setName(company.name);
            setMobile(company.mobile || "");
            setAddress(company.address || "");
            setStatus(company.status || "active");
        } else {
            setActiveCompany(null);
            setName("");
            setMobile("");
            setAddress("");
            setStatus("active");
        }
        setIsModalOpen(true);
    };

    const openViewModal = (company: Company) => {
        setViewCompany(company);
        setIsViewModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toaster("error", "Company name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                mobile: mobile.trim(),
                address: address.trim(),
                status,
            };

            if (modalMode === "add") {
                const res = await apiService.post("/api/v1/companies", payload);
                toaster("success", "Company added successfully");
                setCompanies((prev) =>
                    [...prev, res.data || res].sort((a, b) =>
                        a.name.localeCompare(b.name)
                    )
                );
            } else if (modalMode === "edit" && activeCompany) {
                const res = await apiService.put(
                    `/api/v1/companies/${activeCompany.id}`,
                    payload
                );
                toaster("success", "Company updated successfully");
                setCompanies((prev) =>
                    prev
                        .map((c) =>
                            c.id === activeCompany.id ? res.data || res : c
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toaster(
                "error",
                error.response?.data?.message ||
                    "Failed to save company details."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCompanies = companies.filter((c) => {
        const query = searchQuery.toLowerCase();
        return (
            c.name.toLowerCase().includes(query) ||
            (c.mobile && c.mobile.toLowerCase().includes(query)) ||
            (c.address && c.address.toLowerCase().includes(query))
        );
    });

    return (
        <div className="space-y-6">
            {/* Page Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/45 border border-border/80 p-6 rounded-2xl backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-indigo-500" />
                        <span>Company Directory</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage registered client companies, partners, or service
                        providers.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => openModal("add")}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500 shadow-md shadow-indigo-500/10 hover:scale-[1.02]"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Company</span>
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                    type="text"
                    placeholder="Search by company name, mobile, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-card/45 border border-border/80 rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-hidden focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all backdrop-blur-xs h-9"
                />
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <span className="text-sm text-muted-foreground font-medium">
                            Loading company directories...
                        </span>
                    </div>
                </div>
            ) : (
                <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-accent/10">
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Company Name
                                    </th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Mobile No
                                    </th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Address
                                    </th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredCompanies.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="p-8 text-center text-sm text-muted-foreground italic"
                                        >
                                            No companies found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <tr
                                            key={company.id}
                                            className="hover:bg-accent/20 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-semibold text-sm text-foreground">
                                                        {company.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-foreground font-medium">
                                                {company.mobile ? (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Phone className="h-3.5 w-3.5 text-indigo-500/70" />
                                                        <span>
                                                            {company.mobile}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/40 italic text-xs">
                                                        Not Provided
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-foreground max-w-xs truncate">
                                                {company.address ? (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <MapPin className="h-3.5 w-3.5 text-indigo-500/70 shrink-0" />
                                                        <span
                                                            className="truncate"
                                                            title={
                                                                company.address
                                                            }
                                                        >
                                                            {company.address}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/40 italic text-xs">
                                                        Not Provided
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                        company.status ===
                                                        "active"
                                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                            : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                                                    }`}
                                                >
                                                    {company.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        onClick={() =>
                                                            openViewModal(
                                                                company
                                                            )
                                                        }
                                                        className="p-1.5 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() =>
                                                                openModal(
                                                                    "edit",
                                                                    company
                                                                )
                                                            }
                                                            className="p-1.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg cursor-pointer transition-all"
                                                            title="Edit Company"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD / EDIT DIALOG */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-xl">
                    <DialogHeader className="border-b pb-3 mb-4">
                        <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-indigo-500" />
                            <span>
                                {modalMode === "add"
                                    ? "Register New Company"
                                    : "Edit Company Details"}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Provide company information to save.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Company Name *
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Acme Corporation"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-0 transition-all h-9"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Mobile No
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. +91 9876543210"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-0 transition-all h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Address
                            </label>
                            <textarea
                                placeholder="e.g. 123 Main St, Springfield"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-0 transition-all min-h-20 max-h-40 resize-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Status
                            </label>
                            <Select
                                value={status}
                                onValueChange={(val) =>
                                    setStatus(val as "active" | "inactive")
                                }
                            >
                                <SelectTrigger className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-hidden focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all h-9 text-left">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="active"
                                        className="cursor-pointer"
                                    >
                                        Active
                                    </SelectItem>
                                    <SelectItem
                                        value="inactive"
                                        className="cursor-pointer"
                                    >
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500 shadow-sm"
                            >
                                {isSubmitting && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )}
                                <span>Save</span>
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* VIEW DIALOG */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-xl space-y-5">
                    {viewCompany && (
                        <>
                            <DialogHeader className="border-b pb-3">
                                <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4 text-indigo-500" />
                                    <span>Company Profile</span>
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Company profile information details.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Company Name
                                    </span>
                                    <div className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-indigo-500/70" />
                                        <span>{viewCompany.name}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Mobile Number
                                    </span>
                                    <div className="text-sm text-foreground mt-1 flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-indigo-500/70" />
                                        <span>
                                            {viewCompany.mobile || (
                                                <span className="text-muted-foreground/40 italic text-xs">
                                                    Not Provided
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Address
                                    </span>
                                    <div className="text-sm text-foreground mt-1 flex items-start gap-2 bg-accent/10 p-3 rounded-lg border border-border/50">
                                        <MapPin className="h-4 w-4 text-indigo-500/70 mt-0.5 shrink-0" />
                                        <span className="whitespace-pre-wrap">
                                            {viewCompany.address || (
                                                <span className="text-muted-foreground/40 italic text-xs">
                                                    Not Provided
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Status
                                        </span>
                                        <div className="mt-1">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    viewCompany.status ===
                                                    "active"
                                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                        : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                                                }`}
                                            >
                                                {viewCompany.status}
                                            </span>
                                        </div>
                                    </div>
                                    {viewCompany.created_at && (
                                        <div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Registered On
                                            </span>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-indigo-500/70" />
                                                <span>
                                                    {new Date(
                                                        viewCompany.created_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-border/40">
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageCompanies;
