import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, chmodSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Update version in package.json to vYY.MMdd.HHmm
const now = new Date();
const YY = String(now.getFullYear()).slice(-2);
const MM = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const HH = String(now.getHours()).padStart(2, '0');
const mm = String(now.getMinutes()).padStart(2, '0');
const newVersion = `${YY}.${MM}${dd}.${HH}${mm}`;

const packageJsonPath = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version updated to ${newVersion}`);

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

// Add shebang and require shim for dynamic requires
const outfile = join(__dirname, 'dist/ccstatusline.js');
let content = readFileSync(outfile, 'utf8');

// Remove any existing shebang from esbuild
content = content.replace(/^#!.*\n/, '');

// Add shebang and require shim (source code defines __filename and __dirname)
const shimCode = `#!/usr/bin/env node
import { createRequire as __createRequire } from 'module';
const require = __createRequire(import.meta.url);
`;

writeFileSync(outfile, shimCode + content);
chmodSync(outfile, 0o755);

console.log('Build complete: dist/ccstatusline.js');
