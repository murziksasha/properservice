import type { NextConfig } from 'next';
import path from 'path';

/**
 * Sass still emits deprecation ModuleWarnings for legacy @import.
 * PackFileCacheStrategy cannot serialize those Warning objects → console spam.
 * Strip them from the module so the webpack pack cache stays clean.
 */
function stripSassDeprecationWarningsPlugin() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apply(compiler: any) {
      compiler.hooks.compilation.tap('StripSassDeprecationWarnings', (compilation: any) => {
        compilation.hooks.succeedModule.tap('StripSassDeprecationWarnings', (module: any) => {
          const resource = String(module.resource || module.userRequest || '');
          if (!/\.s[ac]ss(\?|$)/i.test(resource) && !/globals\.scss/i.test(resource)) return;
          if (!module.warnings?.length) return;
          module.warnings = module.warnings.filter((w: { message?: string } | string) => {
            const msg = typeof w === 'string' ? w : String(w?.message ?? w);
            return !/deprecation|@import rules are deprecated|legacy-js-api|repetitive deprecation|No serializer registered for Warning/i.test(
              msg,
            );
          });
        });
      });
    },
  };
}

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    // Soft crossfade on App Router navigations (paired with styles/motion.scss)
    viewTransition: true,
  },
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'src/sass'),
      path.join(__dirname, 'src'),
    ],
    // Legacy @import tree (src/sass + styles/*). Silence until migrated to @use.
    silenceDeprecations: ['import', 'legacy-js-api'],
    quietDeps: true,
  },
  webpack(config) {
    config.plugins = config.plugins || [];
    config.plugins.push(stripSassDeprecationWarningsPlugin());
    config.ignoreWarnings = [
      ...(Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : []),
      /Sass @import rules are deprecated/i,
      /legacy-js-api/i,
      /repetitive deprecation warnings omitted/i,
    ];
    return config;
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/img/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
