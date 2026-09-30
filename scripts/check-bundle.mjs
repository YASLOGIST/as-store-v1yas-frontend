import {readdir, readFile, stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';

const root = new URL('../dist/client/', import.meta.url);
const budgets = {
  largestJavaScriptGzip: 50 * 1024,
  totalJavaScriptGzip: 150 * 1024,
  totalCssGzip: 12 * 1024,
};

async function walk(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const location = path.join(directory.pathname, entry.name);
      return entry.isDirectory() ? walk(new URL(`${entry.name}/`, directory)) : location;
    }),
  );
  return nested.flat();
}

try {
  await stat(root);
} catch {
  console.error('Bundle output is missing. Run `npm run build:ci` first.');
  process.exit(1);
}

const assets = await walk(root);
const measured = await Promise.all(
  assets
    .filter((file) => /\.(?:js|css)$/.test(file))
    .map(async (file) => ({
      file: path.relative(root.pathname, file),
      type: path.extname(file),
      gzip: gzipSync(await readFile(file)).byteLength,
    })),
);
const javascript = measured.filter(({type}) => type === '.js');
const css = measured.filter(({type}) => type === '.css');
const total = (items) => items.reduce((sum, item) => sum + item.gzip, 0);
const largest = javascript.reduce(
  (current, item) => (item.gzip > current.gzip ? item : current),
  {file: 'none', gzip: 0},
);
const results = {
  largestJavaScriptGzip: largest.gzip,
  totalJavaScriptGzip: total(javascript),
  totalCssGzip: total(css),
};

const report = Object.entries(results)
  .map(
    ([metric, bytes]) =>
      `${metric}: ${(bytes / 1024).toFixed(1)} KiB / ${(budgets[metric] / 1024).toFixed(1)} KiB — ${bytes <= budgets[metric] ? 'PASS' : 'FAIL'}`,
  )
  .join('\n');
process.stdout.write(`${report}\nLargest JavaScript asset: ${largest.file}\n`);

const failures = Object.entries(results).filter(
  ([metric, bytes]) => bytes > budgets[metric],
);
if (failures.length) {
  console.error(`Bundle budget exceeded: ${failures.map(([name]) => name).join(', ')}`);
  process.exit(1);
}
