import fs from 'node:fs';
import { build } from 'esbuild';

const OPTIONAL_NATIVE_EXTERNALS = [
  'vscode',
  'pg-native',
  'pg-cloudflare',
  'kerberos',
  '@mongodb-js/zstd',
  '@aws-sdk/credential-providers',
  'gcp-metadata',
  'snappy',
  'socks',
  'mongodb-client-encryption',
  'aws4',
  'cardinal',
  'oci-common',
  'oci-objectstorage',
  'oci-secrets',
  '@azure/identity',
  '@azure/keyvault-secrets',
];

async function main() {
  fs.rmSync('out', { recursive: true, force: true });
  fs.mkdirSync('out', { recursive: true });

  await build({
    entryPoints: ['src-extension/extension.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'out/extension.js',
    sourcemap: true,
    minify: false,
    external: OPTIONAL_NATIVE_EXTERNALS,
    logLevel: 'info',
  });

  fs.writeFileSync('out/package.json', JSON.stringify({ type: 'commonjs' }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
