import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Node 25 drops stdout from Next's detached TypeScript CLI child process.
  // The compiler API performs the same build-time type check without that process.
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
