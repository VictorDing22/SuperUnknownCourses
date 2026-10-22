import type { NextConfig } from 'next';

/**
 * 校园部署（software 分支）会挂在 https://101.42.182.117/plaza/ 下，
 * 通过 NEXT_PUBLIC_BASE_PATH=/plaza 注入（见 package.json 的 build:campus）。
 * 不设这个变量时 basePath 为空，行为和 main 分支一致。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

export default nextConfig;
