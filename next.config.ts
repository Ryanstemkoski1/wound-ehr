import type { NextConfig } from "next";

// Derive Supabase project hostname from env so non-prod environments
// (preview, staging, dev) can point Image at their own bucket without
// editing source. Fail fast in production if missing — a wrong value
// causes silent 400s on every <Image src=>.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL must be set so next/image can load Supabase storage URLs"
  );
}
const supabaseHost = new URL(supabaseUrl).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/sign/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Allow larger Server Action payloads (audio uploads, etc.)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Enable compression
  compress: true,
};

export default nextConfig;
