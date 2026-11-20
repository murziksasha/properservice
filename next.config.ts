import type { NextConfig } from 'next';
import path from 'path';

/**
 * Style modules often attach ModuleWarning (Sass deprecations, autoprefixer).
 * PackFileCacheStrategy cannot serialize Warning → "Skipped not serializable cache item".
 * Strip those warnings from the module so the pack cache stays clean.
 *
 * Webpack removed writable `module.warnings` (getter-only). Mutate getWarnings()/_warnings.
 */
function isStyleModule(mod: { resource?: string; userRequest?: string; identifier?: () => string }) {
  const id = [mod.resource, mod.userRequest, typeof mod.identifier === 'function' ? mod.identifier() : '']
    .filter(Boolean)
    .join('\n');
  return /\.(s?css|sass)(\?|$|!)/i.test(id) || /globals\.scss/i.test(id);
}

function clearModuleWarnings(mod: { getWarnings?: () => unknown[] | undefined; _warnings?: unknown[] }) {
  const warnings = typeof mod.getWarnings === 'function' ? mod.getWarnings() : mod._warnings;
  if (warnings?.length) warnings.splice(0, warnings.length);
}

/**
 * Style ModuleWarnings (Sass, autoprefixer) are not pack-serializable.
 * Clear them so PackFileCacheStrategy does not spam "No serializer registered for Warning".
 */
function stripStyleModuleWarningsPlugin() {
  return {
    apply(compiler: any) {
      compiler.hooks.compilation.tap('StripStyleModuleWarnings', (compilation: any) => {
        const scrub = (mod: any) => {
          if (isStyleModule(mod)) clearModuleWarnings(mod);
        };
        compilation.hooks.succeedModule.tap('StripStyleModuleWarnings', scrub);
        // Loaders may add warnings after succeedModule — scrub again before cache write.
        compilation.hooks.finishModules.tap('StripStyleModuleWarnings', (modules: Iterable<any>) => {
          for (const mod of modules) scrub(mod);
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
    includePaths: [path.join(__dirname, 'src/sass'), path.join(__dirname, 'src')],
    // Legacy @import tree (src/sass + styles/*). Silence until migrated to @use.
    silenceDeprecations: ['import', 'legacy-js-api'],
    quietDeps: true,
  },
  webpack(config) {
    config.plugins = config.plugins || [];
    config.plugins.push(stripStyleModuleWarningsPlugin());
    config.ignoreWarnings = [
      ...(Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : []),
      /Sass @import rules are deprecated/i,
      /legacy-js-api/i,
      /repetitive deprecation warnings omitted/i,
      /autoprefixer: start value has mixed support/i,
      /No serializer registered for Warning/i,
    ];
    return config;
  },
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.keenetic.net https://*.keenetic.pro",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "connect-src 'self' https://*.keenetic.net https://*.keenetic.pro",
      "frame-src 'self' https://www.google.com https://*.google.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
        ],
      },
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
