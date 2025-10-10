import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await build({
  entryPoints: [join(__dirname, 'src/ccstatusline.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: join(__dirname, 'dist/ccstatusline.js'),
  format: 'esm',
  external: [],
  minify: false,
  sourcemap: false,
});

// Add shebang and ESM compatibility shim
import { readFileSync, writeFileSync, chmodSync } from 'fs';
const outfile = join(__dirname, 'dist/ccstatusline.js');
let content = readFileSync(outfile, 'utf8');

// Remove any existing shebang from esbuild
content = content.replace(/^#!.*\n/, '');

// Add shebang and ESM shim at the very beginning
const shimCode = `#!/usr/bin/env node
import { createRequire as __createRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = new URL('.', import.meta.url).pathname.replace(/\\/$/, '');
`;

writeFileSync(outfile, shimCode + content);
chmodSync(outfile, 0o755);

console.log('Build complete: dist/ccstatusline.js');
