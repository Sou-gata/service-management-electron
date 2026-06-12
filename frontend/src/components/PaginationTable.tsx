import {
    useState,
    useMemo,
    useRef,
    useCallback,
    useEffect,
    Fragment,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Settings2,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column {
    key: string;
    header: string;
    isShortable?: boolean;
    width?: number;
    hiddenByDefault?: boolean;
}

interface PaginationTableProps {
    columns: Column[];
    data: any[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onSort?: (key: string, direction: "asc" | "desc") => void;
    title?: string | React.ReactNode;
    position?: "top" | "bottom";
    resizable?: boolean;
    rowsPerPage?: number;
    onRowsPerPageChange?: (value: number) => void;
}

const PaginationTable: React.FC<PaginationTableProps> = ({
    columns = [],
    data = [],
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {},
    onSort = () => {},
    title,
    position = "bottom",
    resizable = true,
    rowsPerPage = 10,
    onRowsPerPageChange,
}) => {
    // Generate unique keys based on the columns structure to store settings in localStorage
    const storageKey = useMemo(() => {
        const columnKeys = columns.map((col) => col.key).join("_");
        return `pagination_table_columns_${columnKeys}`;
    }, [columns]);

    const widthsStorageKey = useMemo(() => {
        const columnKeys = columns.map((col) => col.key).join("_");
        return `pagination_table_widths_${columnKeys}`;
    }, [columns]);

    // State for visible columns
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
        new Set(
            columns.filter((col) => !col.hiddenByDefault).map((col) => col.key)
        )
    );

    // Sync visibleColumnKeys when columns/storageKey changes (e.g. on mount or if columns load dynamically)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            } else {
                setVisibleColumnKeys(
                    new Set(
                        columns
                            .filter((col) => !col.hiddenByDefault)
                            .map((col) => col.key)
                    )
                );
            }
        } catch (e) {
            console.error(
                "Error reading visible columns from localStorage:",
                e
            );
        }
    }, [storageKey, columns]);

    const saveVisibleColumns = useCallback(
        (keys: Set<string>) => {
            setVisibleColumnKeys(keys);
            try {
                localStorage.setItem(
                    storageKey,
                    JSON.stringify(Array.from(keys))
                );
            } catch (e) {
                console.error(
                    "Error saving visible columns to localStorage:",
                    e
                );
            }
        },
        [storageKey]
    );

    // Local state for rowsPerPage to handle debouncing
    const [localRowsPerPage, setLocalRowsPerPage] = useState(rowsPerPage);

    // Sync local state when prop changes
    useEffect(() => {
        setLocalRowsPerPage(rowsPerPage);
    }, [rowsPerPage]);

    // Debounce the onRowsPerPageChange callback
    useEffect(() => {
        if (localRowsPerPage === rowsPerPage) return;

        const timer = setTimeout(() => {
            if (localRowsPerPage > 0) {
                onRowsPerPageChange?.(localRowsPerPage);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [localRowsPerPage, onRowsPerPageChange, rowsPerPage]);

    // Memoize visible columns for performance
    const visibleColumns = useMemo(
        () => columns.filter((col) => visibleColumnKeys.has(col.key)),
        [columns, visibleColumnKeys]
    );

    // State for column resizing
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
        {}
    );

    // Load saved widths
    useEffect(() => {
        try {
            const saved = localStorage.getItem(widthsStorageKey);
            if (saved) {
                setColumnWidths(JSON.parse(saved));
            } else {
                setColumnWidths({});
            }
        } catch (e) {
            console.error("Error reading column widths from localStorage:", e);
        }
    }, [widthsStorageKey]);

    const resizingRef = useRef<{
        key: string;
        startX: number;
        startWidth: number;
    } | null>(null);

    const handleResizeStart = useCallback(
        (e: React.MouseEvent, key: string) => {
            e.preventDefault();
            const th = (e.target as HTMLElement).closest("th");
            if (!th) return;

            const startWidth = th.offsetWidth;
            resizingRef.current = {
                key,
                startX: e.clientX,
                startWidth,
            };

            const handleMouseMove = (e: MouseEvent) => {
                if (!resizingRef.current) return;
                const currentKey = resizingRef.current.key;
                const deltaX = e.clientX - resizingRef.current.startX;
                const newWidth = Math.max(
                    30,
                    resizingRef.current.startWidth + deltaX
                ); // Min width 30px
                setColumnWidths((prev) => {
                    const next = {
                        ...prev,
                        [currentKey]: newWidth,
                    };
                    try {
                        localStorage.setItem(
                            widthsStorageKey,
                            JSON.stringify(next)
                        );
                    } catch (e) {
                        console.error(
                            "Error saving column widths to localStorage:",
                            e
                        );
                    }
                    return next;
                });
            };

            const handleMouseUp = () => {
                resizingRef.current = null;
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.cursor = ""; // Reset cursor on body
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "col-resize"; // Apply cursor to body while dragging
        },
        [widthsStorageKey]
    );

    const toggleColumn = (key: string) => {
        const newVisible = new Set(visibleColumnKeys);
        if (newVisible.has(key)) {
            // Prevent hiding all columns
            if (newVisible.size > 1) {
                newVisible.delete(key);
            }
        } else {
            newVisible.add(key);
        }
        saveVisibleColumns(newVisible);
    };

    const getColumnStyle = (key: string, defaultWidth?: number) => {
        const width = columnWidths[key] || defaultWidth;
        if (width) {
            return {
                width: `${width}px`,
                minWidth: `${width}px`,
                maxWidth: `${width}px`,
            };
        }
        return {};
    };

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-2 mb-2">
                {position === "bottom" ? (
                    <div className="text-sm font-semibold text-foreground/80">
                        {title}
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="text-xs text-muted-foreground">
                            Page{" "}
                            <span className="font-medium text-foreground">
                                {currentPage}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium text-foreground">
                                {totalPages}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => onPageChange(1)}
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                    <span className="sr-only">First page</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                        onPageChange(currentPage - 1)
                                    }
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="sr-only">
                                        Previous page
                                    </span>
                                </Button>
                            </div>

                            <div className="flex items-center gap-1">
                                {Array.from(
                                    { length: totalPages },
                                    (_, i) => i + 1
                                )
                                    .filter((page) => {
                                        // Show first, last, and pages around current
                                        return (
                                            page === 1 ||
                                            page === totalPages ||
                                            Math.abs(page - currentPage) <= 1
                                        );
                                    })
                                    .map((page, index, array) => (
                                        <Fragment key={page}>
                                            {index > 0 &&
                                                array[index - 1] !==
                                                    page - 1 && (
                                                    <span className="text-muted-foreground px-1">
                                                        ...
                                                    </span>
                                                )}
                                            <Button
                                                variant={
                                                    currentPage === page
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                className="h-8 w-8 p-0 text-xs"
                                                onClick={() =>
                                                    onPageChange(page)
                                                }
                                            >
                                                {page}
                                            </Button>
                                        </Fragment>
                                    ))}
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                        onPageChange(currentPage + 1)
                                    }
                                    disabled={currentPage >= totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    <span className="sr-only">Next page</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => onPageChange(totalPages)}
                                    disabled={currentPage >= totalPages}
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                    <span className="sr-only">Last page</span>
                                </Button>
                            </div>

                            <div className="flex items-center gap-1 ml-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Rows:
                                </span>
                                <input
                                    type="number"
                                    value={localRowsPerPage}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setLocalRowsPerPage(val);
                                    }}
                                    className="w-12 h-8 px-1 text-xs border rounded bg-background text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                    min={1}
                                />
                            </div>
                        </div>
                    </div>
                )}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Settings2 className="h-4 w-4" />
                            <span>Columns</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                        <div className="space-y-2">
                            <div className="text-sm font-medium border-b pb-2 mb-2">
                                Toggle Columns
                            </div>
                            <div className="max-h-75 overflow-y-auto space-y-1">
                                {columns.map((column) => (
                                    <button
                                        key={column.key}
                                        onClick={() => toggleColumn(column.key)}
                                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-md transition-colors text-left group"
                                    >
                                        <div
                                            className={cn(
                                                "flex items-center justify-center h-4 w-4 rounded border border-primary transition-colors",
                                                visibleColumnKeys.has(
                                                    column.key
                                                )
                                                    ? "bg-primary border-primary"
                                                    : "bg-transparent border-input group-hover:border-primary"
                                            )}
                                        >
                                            {visibleColumnKeys.has(
                                                column.key
                                            ) && (
                                                <Check className="h-3 w-3 text-primary-foreground" />
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                "truncate",
                                                !visibleColumnKeys.has(
                                                    column.key
                                                ) && "text-muted-foreground"
                                            )}
                                        >
                                            {column.header}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="overflow-x-auto border rounded-lg bg-card shadow-sm">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                        <tr>
                            {visibleColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-1 py-2 font-semibold text-xs uppercase tracking-wider text-center border-r relative group"
                                    style={getColumnStyle(
                                        column.key,
                                        column.width
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span>{column.header}</span>
                                        {column.isShortable && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button className="p-1 hover:bg-accent rounded-md transition-colors group">
                                                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-40 p-1"
                                                    align="start"
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            onClick={() =>
                                                                onSort(
                                                                    column.key,
                                                                    "asc"
                                                                )
                                                            }
                                                            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm w-full text-left transition-colors"
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                            <span>
                                                                Ascending
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                onSort(
                                                                    column.key,
                                                                    "desc"
                                                                )
                                                            }
                                                            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm w-full text-left transition-colors"
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                            <span>
                                                                Descending
                                                            </span>
                                                        </button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                    {resizable && (
                                        <div
                                            onMouseDown={(e) =>
                                                handleResizeStart(e, column.key)
                                            }
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Resize column"
                                        />
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.length > 0 ? (
                            data.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className="hover:bg-accent/50 transition-colors"
                                >
                                    {visibleColumns.map((column, colIdx) => (
                                        <td
                                            key={column.key}
                                            className={`px-1 py-1 text-xs text-center border-r text-foreground/80 wrap-break-word ${colIdx !== visibleColumns.length - 1 ? "border-r" : ""}`}
                                            style={getColumnStyle(
                                                column.key,
                                                column.width
                                            )}
                                        >
                                            {row[column.key] ||
                                            row[column.key] == 0
                                                ? row[column.key]
                                                : "--"}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length}
                                    className="px-4 py-8 text-center text-muted-foreground italic"
                                >
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {position === "bottom" ? (
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-2 mt-2">
                    <div className="text-xs text-muted-foreground">
                        Page{" "}
                        <span className="font-medium text-foreground">
                            {currentPage}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-foreground">
                            {totalPages}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onPageChange(1)}
                                disabled={currentPage <= 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                                <span className="sr-only">First page</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Previous page</span>
                            </Button>
                        </div>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((page) => {
                                    // Show first, last, and pages around current
                                    return (
                                        page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1
                                    );
                                })
                                .map((page, index, array) => (
                                    <Fragment key={page}>
                                        {index > 0 &&
                                            array[index - 1] !== page - 1 && (
                                                <span className="text-muted-foreground px-1">
                                                    ...
                                                </span>
                                            )}
                                        <Button
                                            variant={
                                                currentPage === page
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="sm"
                                            className="h-8 w-8 p-0 text-xs"
                                            onClick={() => onPageChange(page)}
                                        >
                                            {page}
                                        </Button>
                                    </Fragment>
                                ))}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Next page</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onPageChange(totalPages)}
                                disabled={currentPage >= totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                                <span className="sr-only">Last page</span>
                            </Button>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                Rows:
                            </span>
                            <input
                                type="number"
                                value={localRowsPerPage}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setLocalRowsPerPage(val);
                                }}
                                className="w-12 h-8 px-1 text-xs border rounded bg-background text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                min={1}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-end px-2 mt-2 w-full">
                    {title}
                </div>
            )}
        </div>
    );
};

export default PaginationTable;
