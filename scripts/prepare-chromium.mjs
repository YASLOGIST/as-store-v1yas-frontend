import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {brotliDecompressSync} from 'node:zlib';
import serverlessChromium from '@sparticuz/chromium';

const exec = promisify(execFile);
const libraryDirectory = '/tmp/lib';

try {
  await access(`${libraryDirectory}/libnspr4.so`);
} catch {
  await mkdir('/tmp/al2023', {recursive: true});
  const compressed = await readFile(
    new URL(
      '../node_modules/@sparticuz/chromium/bin/al2023.tar.br',
      import.meta.url,
    ),
  );
  const archive = '/tmp/al2023.tar';
  await writeFile(archive, brotliDecompressSync(compressed));
  await exec('tar', ['-xf', archive, '-C', '/tmp']);
}

process.env.LD_LIBRARY_PATH = [libraryDirectory, process.env.LD_LIBRARY_PATH]
  .filter(Boolean)
  .join(':');

export const chromiumExecutable = await serverlessChromium.executablePath();
export const chromiumArgs = serverlessChromium.args;
