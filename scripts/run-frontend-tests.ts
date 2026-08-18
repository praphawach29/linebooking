import { readdir } from 'node:fs/promises';

const testDirectory = new URL('../src/lib/', import.meta.url);
const testFiles = (await readdir(testDirectory))
  .filter((file) => file.endsWith('.test.ts'))
  .sort();

for (const testFile of testFiles) {
  await import(new URL(testFile, testDirectory).href);
}
