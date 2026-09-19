import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    // Images are served directly from the Spring Boot backend, bypass Next.js optimisation
    unoptimized: true,
  },
  ...(isDev && {
    allowedDevOrigins: [
      "192.168.1.*", // WiFi IP testing
    ],
  }),
};

export default nextConfig;
