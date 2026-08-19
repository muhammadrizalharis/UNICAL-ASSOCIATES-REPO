import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Menghasilkan server mandiri agar image container tetap ramping.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
