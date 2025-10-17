import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xmsyjijnribmnfundfto.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "sfrsjfueqdkfjtlsflgz.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "t.me",
        port: "",
        pathname: "/i/userpic/**",
      },
    ],
    // Ensure optimized, responsive images in all environments (matches localhost behavior)
    unoptimized: false,
    // Alternative: Use loader for better control
    loader: "default",
    // Ensure proper handling of dynamic image paths
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
