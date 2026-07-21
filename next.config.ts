import type { NextConfig } from "next";

/**
 * Logos and menu photos are served from Supabase Storage, and next/image
 * refuses remote hosts unless they are listed here. Derived from the project
 * URL so it follows the environment instead of being hardcoded.
 */
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
