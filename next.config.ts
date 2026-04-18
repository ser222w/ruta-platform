import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

import { execSync } from 'child_process';

function getDeployInfo() {
  try {
    const sha = process.env.SOURCE_COMMIT?.slice(0, 7)
      ?? execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Kyiv'
    });
    const log = execSync('git log -3 --pretty=%s').toString().trim().split('\n')
      .map(s => s.replace(/^(feat|fix|chore|refactor|test|docs)[:(].*/i, m => {
        const match = m.match(/\(([^)]+)\)/);
        return match ? match[1] : m.replace(/^(feat|fix|chore):\s*/i, '');
      }).slice(0, 24))
      .join(', ');
    return { sha, date, log };
  } catch {
    return { sha: 'dev', date: '', log: '' };
  }
}

const { sha, date, log } = getDeployInfo();

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOY_SHA: sha,
    NEXT_PUBLIC_DEPLOY_DATE: date,
    NEXT_PUBLIC_DEPLOY_LOG: log,
  },
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'clerk.com',
        port: ''
      }
    ]
  },
  transpilePackages: ['geist'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
};

let configWithPlugins = baseConfig;

// Conditionally enable Sentry configuration
if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  configWithPlugins = withSentryConfig(configWithPlugins, {
    org: process.env.NEXT_PUBLIC_SENTRY_ORG,
    project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    tunnelRoute: '/monitoring',

    // Disable Sentry telemetry
    telemetry: false,

    // Sentry v10: moved under webpack namespace
    webpack: {
      reactComponentAnnotation: {
        enabled: true
      },
      treeshake: {
        removeDebugLogging: true
      }
    },

    // Disable source map upload when org/project are not configured
    sourcemaps: {
      disable: !process.env.NEXT_PUBLIC_SENTRY_ORG || !process.env.NEXT_PUBLIC_SENTRY_PROJECT
    }
  });
}

const nextConfig = configWithPlugins;
export default nextConfig;
