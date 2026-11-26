import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const resources = [
  { name: 'dashboard', directory: 'static/dashboard' },
  { name: 'issue-panel', directory: 'static/issue-panel' }
];

for (const resource of resources) {
  const source = resource.directory;
  const output = `${source}/build`;
  await mkdir(output, { recursive: true });
  await copyFile(`${source}/index.html`, `${output}/index.html`);
  await copyFile(`${source}/styles.css`, `${output}/styles.css`);
  await build({
    entryPoints: [`${source}/app.js`],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    ...(process.env.FORGE_BRIDGE_MOCK === 'true' ? { alias: { '@forge/bridge': resolve('test/fixtures/forge-bridge.mjs') } } : {}),
    outfile: `${output}/app.bundle.js`
  });
  process.stdout.write(`Built ${resource.name} Custom UI resources.\\n`);
}
