/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@x402warden/sdk"],
  turbopack: {},
  serverExternalPackages: ["@solana/web3.js", "@coral-xyz/anchor"],
};

module.exports = nextConfig;
