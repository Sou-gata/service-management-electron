import axios from "axios";
import baseURL from "./baseURL.js";
import { navigateTo } from "./navigationHelper.js";
import toaster from "./toaster.js";

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000,
});

function adjustISOStringToLocalAsUTC(val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const adjusted = new Date(
            d.getTime() - d.getTimezoneOffset() * 60 * 1000
        );
        return adjusted.toISOString();
    }
    return val;
}

function adjustDates(obj) {
    if (!obj || typeof obj !== "object") return obj;

    if (typeof FormData !== "undefined" && obj instanceof FormData) {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime() - obj.getTimezoneOffset() * 60 * 1000);
    }

    if (Array.isArray(obj)) {
        return obj.map(adjustDates);
    }

    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val instanceof Date) {
            newObj[key] = new Date(
                val.getTime() - val.getTimezoneOffset() * 60 * 1000
            );
        } else if (
            typeof val === "string" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)
        ) {
            newObj[key] = adjustISOStringToLocalAsUTC(val);
        } else if (typeof val === "object" && val !== null) {
            newObj[key] = adjustDates(val);
        } else {
            newObj[key] = val;
        }
    }
    return newObj;
}

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.params) {
            config.params = adjustDates(config.params);
        }
        if (config.data) {
            config.data = adjustDates(config.data);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            if (data?.seassonExpired || data?.sessionExpired || status === 401 || (data?.message && data.message.includes("expired access token"))) {
                if (!window.sessionExpiredRedirecting) {
                    window.sessionExpiredRedirecting = true;
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    toaster("error", "Session expired. Please log in again.");
                    navigateTo("/");
                    setTimeout(() => {
                        window.sessionExpiredRedirecting = false;
                    }, 5000);
                }
            }

            switch (status) {
                case 401:
                    console.error("Unauthorized access");
                    break;
                case 403:
                    console.error("Access forbidden");
                    break;
                case 500:
                    console.error("Server error");
                    break;
                default:
                    console.error("Request failed:", data, status);
            }
        } else if (error.request) {
            console.error("Network error:", error.request);
        } else {
            console.log("Error:", error.message);
        }
        return Promise.reject(error);
    }
);

class ApiService {
    async get(endpoint, config = {}) {
        try {
            const response = await apiClient.get(endpoint, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async post(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.post(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async put(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.put(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async delete(endpoint, config = {}) {
        try {
            const response = await apiClient.delete(endpoint, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async patch(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.patch(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async downloadFile(endpoint, filename, config = {}) {
        try {
            const response = await apiClient.get(endpoint, {
                ...config,
                responseType: "blob",
            });

            const disposition = response.headers["content-disposition"];
            let finalFilename = filename || "download.file";

            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(
                    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
                );
                if (match?.[1]) {
                    finalFilename = match[1].replace(/['"]/g, "");
                }
            }

            const blob = new Blob([response.data], {
                type: response.headers["content-type"],
            });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", finalFilename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            throw error;
        }
    }

    async openPdfForPrint(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.post(endpoint, data, {
                ...config,
                responseType: "blob",
                headers: {
                    ...config.headers,
                    "Content-Type": "application/json",
                },
            });

            const disposition = response.headers["content-disposition"];
            let filename = "download.pdf";

            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(
                    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
                );
                if (match?.[1]) {
                    filename = match[1].replace(/['"]/g, "");
                }
            }

            const blob = new Blob([response.data], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);

            const printWindow = window.open(blobUrl, "_blank");

            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                };
            } else {
                throw new Error(
                    "Popup blocked! Please allow popups for this site."
                );
            }

            return filename;
        } catch (error) {
            throw error;
        }
    }
}
const apiService = new ApiService();

export default apiService;

export { ApiService };
