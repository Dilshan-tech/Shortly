import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    env: {
      DATA_DIR: path.resolve(__dirname, 'data-test'),
      NODE_ENV: 'test',
      ALLOW_LOCAL_URLS: 'true'
    }
  }
});
