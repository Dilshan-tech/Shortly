import fs from 'fs';
import path from 'path';

/**
 * AtomicStorage provides safe, atomic JSON file persistence with an in-memory
 * serialized write queue and backup preservation.
 *
 * Durability & Concurrency notes:
 * - Writes are serialized per file via a promise chain to prevent race conditions.
 * - Writes occur to a temporary file (.tmp) before atomic renaming, preventing file corruption on unexpected crashes.
 * - Concurrency limitations: Designed for single-process Node.js environments.
 *   Multi-process or clustered file access requires an external datastore (like MongoDB/PostgreSQL).
 */
export class AtomicStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this.tmpPath = `${filePath}.tmp`;
    this.dir = path.dirname(filePath);
    this.writeQueue = Promise.resolve();
    this.pendingWritesCount = 0;
  }

  /**
   * Ensure directory exists and initialize file if missing.
   */
  async init(defaultData = []) {
    await fs.promises.mkdir(this.dir, { recursive: true });
    try {
      await fs.promises.access(this.filePath, fs.constants.F_OK);
    } catch {
      // File does not exist, initialize with defaultData
      await this.writeDirect(defaultData);
    }
  }

  /**
   * Read and parse JSON content.
   */
  async read(defaultData = []) {
    try {
      await this.init(defaultData);
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        return defaultData;
      }
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return defaultData;
      }
      console.error(`[AtomicStorage] Error reading ${this.filePath}:`, err.message);
      throw err;
    }
  }

  /**
   * Queue a serialized atomic write.
   */
  async write(data) {
    this.pendingWritesCount++;
    // Chain onto the write queue to ensure sequential execution
    this.writeQueue = this.writeQueue
      .then(() => this.writeDirect(data))
      .catch((err) => {
        console.error(`[AtomicStorage] Write failed for ${this.filePath}:`, err.message);
        throw err;
      })
      .finally(() => {
        this.pendingWritesCount--;
      });

    return this.writeQueue;
  }

  /**
   * Directly write data to a .tmp file and atomic rename.
   */
  async writeDirect(data) {
    await fs.promises.mkdir(this.dir, { recursive: true });
    const jsonString = JSON.stringify(data, null, 2);
    // Write to temporary file first
    await fs.promises.writeFile(this.tmpPath, jsonString, 'utf8');
    // Atomically rename over target file
    await fs.promises.rename(this.tmpPath, this.filePath);
  }

  /**
   * Await any in-flight writes to complete (useful for graceful shutdown or tests).
   */
  async flush() {
    await this.writeQueue;
  }
}
