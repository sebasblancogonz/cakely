import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  redirects: async () => {
    return [
      {
        source: '/inicio',
        destination: '/',
        permanent: true
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/crosstime/**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**'
      }
    ]
  }
};

export default nextConfig;
