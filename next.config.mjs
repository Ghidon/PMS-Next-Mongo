/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Tell Next which folder is the workspace root
    root: process.cwd(),
  },
};

export default nextConfig;
