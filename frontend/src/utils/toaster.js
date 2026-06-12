import { toast } from "react-hot-toast";
import { createElement } from "react";
import { Info } from "lucide-react";

let lastToastMessage = "";
let lastToastTime = 0;

export default function (type, message) {
    if (!message) return;

    // Suppress raw backend session expiration message
    if (message === "Invalid or expired access token") {
        return;
    }

    const now = Date.now();
    // De-duplicate identical messages shown within 1.5 seconds
    if (message === lastToastMessage && now - lastToastTime < 1500) {
        return;
    }
    lastToastMessage = message;
    lastToastTime = now;

    if (type === "success") {
        return toast.success(message, {
            style: {
                padding: "16px",
                background: "oklch(52.7% 0.154 150.069)", // green-700
                color: "#fff",
            },
            iconTheme: {
                primary: "white",
                secondary: "oklch(52.7% 0.154 150.069)",
            },
        });
    } else if (type === "error") {
        toast.error(message, {
            style: {
                padding: "16px",
                background: "oklch(50.5% 0.213 27.518)", // red-700
                color: "#fff",
            },
            iconTheme: {
                primary: "white",
                secondary: "oklch(50.5% 0.213 27.518)",
            },
        });
    } else if (type === "info") {
        toast(message, {
            style: {
                padding: "16px",
                background: "#fff",
                color: "#000",
                border: "1px solid #2563EB",
            },
            icon: createElement(Info, { size: 25, color: "#2563EB" }),
        });
    }
}
