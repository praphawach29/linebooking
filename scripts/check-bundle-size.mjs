import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const assetsDirectory = path.resolve('dist', 'assets');
const maximumChunkBytes = 500 * 1024;
const files = await readdir(assetsDirectory);
const javascriptFiles = files.filter((file) => file.endsWith('.js'));

if (javascriptFiles.length === 0) {
  throw new Error(`No JavaScript bundles found in ${assetsDirectory}`);
}

const chunks = await Promise.all(
  javascriptFiles.map(async (file) => ({
    file,
    bytes: (await stat(path.join(assetsDirectory, file))).size,
  })),
);

const oversizedChunks = chunks.filter(({bytes}) => bytes > maximumChunkBytes);
const largestChunk = chunks.sort((left, right) => right.bytes - left.bytes)[0];

console.log(
  `Largest JavaScript chunk: ${largestChunk.file} (${(largestChunk.bytes / 1024).toFixed(1)} KiB)`,
);

if (oversizedChunks.length > 0) {
  const details = oversizedChunks
    .map(({file, bytes}) => `${file}: ${(bytes / 1024).toFixed(1)} KiB`)
    .join(', ');
  throw new Error(
    `JavaScript chunk budget exceeded (maximum 500 KiB): ${details}`,
  );
}
