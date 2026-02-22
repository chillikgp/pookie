import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (Next.js 16 default) — empty config to acknowledge it
  turbopack: {},

  // Needed so Next.js serves .wasm and .onnx files from /public/ with correct headers
  async headers() {
    return [
      {
        source: "/:path*.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
      {
        source: "/models/:path*",
        headers: [
          { key: "Content-Type", value: "application/octet-stream" },
        ],
      },
    ];
  },

  // Exclude onnxruntime-web from server-side bundling
  serverExternalPackages: ["onnxruntime-web"],
};

export default nextConfig;
