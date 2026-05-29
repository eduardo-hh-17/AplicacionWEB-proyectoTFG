import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permitir imágenes de cualquier proyecto de Supabase
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // El ** permite cualquier subdominio
      },
    ],
  },
};

export default nextConfig;