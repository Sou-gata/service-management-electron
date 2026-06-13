import fs from "fs";
import path from "path";

let fontsCssCache: string | null = null;

export function getFontsCss(viewsPath: string): string {
    if (fontsCssCache) return fontsCssCache;

    try {
        const fontFiles = {
            "300": "Inter_18pt-Light.ttf",
            "400": "Inter_18pt-Regular.ttf",
            "500": "Inter_18pt-Medium.ttf",
            "600": "Inter_18pt-SemiBold.ttf",
            "700": "Inter_18pt-Bold.ttf",
            "800": "Inter_18pt-ExtraBold.ttf",
        };

        let css = "";
        for (const [weight, filename] of Object.entries(fontFiles)) {
            const filePath = path.join(viewsPath, "fonts", filename);
            if (fs.existsSync(filePath)) {
                const base64 = fs.readFileSync(filePath).toString("base64");
                css += `
@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: ${weight};
    font-display: swap;
    src: url('data:font/truetype;charset=utf-8;base64,${base64}') format('truetype');
}
`;
            } else {
                console.warn(`Font file not found: ${filePath}`);
            }
        }
        fontsCssCache = css;
        return css;
    } catch (err) {
        console.error("Error loading local fonts:", err);
        return "";
    }
}
