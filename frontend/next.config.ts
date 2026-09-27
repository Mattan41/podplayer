import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages hosting (see ARCHITECHTURE.md §5).
  output: "export",
  basePath: process.env.BASE_PATH,

};

export default nextConfig;
