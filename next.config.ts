import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "cdn11.bigcommerce.com" },
      { hostname: "upload.wikimedia.org" },
      { hostname: "thumb.wikimedia.org" },
      { hostname: "commons.wikimedia.org" },
      { hostname: "placehold.co" },
      { hostname: "m.media-amazon.com" },
      { hostname: "encrypted-tbn0.gstatic.com" },
      { hostname: "cdn.shopify.com" },
      { hostname: "5.imimg.com" },
      { hostname: "cpimg.tistatic.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
  serverExternalPackages: [
    "jsonwebtoken",
    "bcryptjs",
    "cloudinary",
    // transformers.js loads an ONNX model through native bindings; bundling it
    // breaks the worker it spawns. See lib/rag/embeddings.ts.
    "@huggingface/transformers",
  ],
};

export default nextConfig;
