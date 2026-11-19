/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ProperService server launcher for PM2.
 * Reliable across platforms including Windows.
 */
const port = process.env.PORT || '3000';
const hostname = process.env.HOSTNAME || '0.0.0.0';

process.argv = [process.argv[0], 'next', 'start', '-H', hostname, '-p', port];

require('next/dist/bin/next');
