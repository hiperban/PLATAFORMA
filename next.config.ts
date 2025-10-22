/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone' // garante geração de /.next/standalone para o Docker
};

export default nextConfig;
