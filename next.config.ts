import type { NextConfig } from 'next';
import path from 'path';

/**
 * Style modules often attach ModuleWarning (Sass deprecations, autoprefixer).
 * PackFileCacheStrategy cannot serialize Warning → "Skipped not serializable cache item".
 * Strip those warnings from the module so the pack cache stays clean.
 *
 * Webpack removed writable `module.warnings` (getter-only). Mutate getWarnings()/_warnings.
 */
function isStyleModule(module: { resource?: string; userRequest?: string; identifier?: () => string }) {
  const id = [
    module.resource,
    module.userRequest,
    typeof module.identifier === 'function' ? module.identifier() : '',
  ]
    .filter(Boolean)
    .join('\n');
  return /\.(s?css|sass)(\?|$|!)/i.test(id) || /globals\.scss/i.test(id);
}

function clearModuleWarnings(module: {
  getWarnings?: () => unknown[] | undefined;
  _warnings?: unknown[];
}) {
  const warnings =
    typeof module.getWarnings === 'function' ? module.getWarnings() : module._warnings;
  if (warnings?.length) warnings.splice(0, warnings.length);
}

/**
 * Style ModuleWarnings (Sass, autoprefixer) are not pack-serializable.
 * Clear them so PackFileCacheStrategy does not spam "No serializer registered for Warning".
 */
function stripStyleModuleWarningsPlugin() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apply(compiler: any) {
      compiler.hooks.compilation.tap('StripStyleModuleWarnings', (compilation: any) => {
        const scrub = (module: any) => {
          if (isStyleModule(module)) clearModuleWarnings(module);
        };
        compilation.hooks.succeedModule.tap('StripStyleModuleWarnings', scrub);
        // Loaders may add warnings after succeedModule — scrub again before cache write.
        compilation.hooks.finishModules.tap('StripStyleModuleWarnings', (modules: Iterable<any>) => {
          for (const module of modules) scrub(module);
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
