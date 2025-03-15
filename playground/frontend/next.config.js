/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add Monaco Editor webpack configuration
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },
};

module.exports = nextConfig;
