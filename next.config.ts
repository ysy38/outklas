import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  async redirects() {
    return [
      {
        source: "/rehber/grammer",
        destination: "/rehber/grammar",
        permanent: true,
      },
      {
        source: "/blog/100-saatlik-video-izleyerek-yds-yokdil-hazirlik",
        destination: "/blog/yds-yokdil-100-saatlik-video-devri-neden-kapandi",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
