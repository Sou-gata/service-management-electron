const path = require("path");

module.exports = {
    entry: "./backend/server.ts",
    target: "node",
    mode: "production",
    externalsPresets: { node: true },
    externals: [
        function ({ context, request }, callback) {
            // Treat node_modules and absolute/relative non-local module references as externals
            if (!request.startsWith(".") && !path.isAbsolute(request)) {
                return callback(null, "commonjs " + request);
            }
            callback();
        }
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        configFile: path.resolve(__dirname, "backend/tsconfig.json"),
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: {
            ".js": [".ts", ".js"],
        },
    },
    output: {
        filename: "server.js",
        path: path.resolve(__dirname, "dist/backend"),
    },
};
