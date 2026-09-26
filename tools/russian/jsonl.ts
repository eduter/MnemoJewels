import { createReadStream } from 'node:fs';
import readline from 'node:readline';

export async function forEachJsonLine<T>(
  path: string,
  callback: (entry: T) => void,
  onMalformed?: () => void,
): Promise<void> {
  const lines = readline.createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) {
    try {
      callback(JSON.parse(line) as T);
    } catch {
      onMalformed?.();
    }
  }
}
