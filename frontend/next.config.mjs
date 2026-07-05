/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* calls to the FastAPI backend so no CORS needed from the browser
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
