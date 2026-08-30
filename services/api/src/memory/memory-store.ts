import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LearningMemoryProfile } from './memory-model';

interface MemoryDatabase {
  schemaVersion: 1;
  profiles: Record<string, LearningMemoryProfile>;
}

export interface LearningMemoryStore {
  get(studentId: string): Promise<LearningMemoryProfile | undefined>;
  save(profile: LearningMemoryProfile): Promise<void>;
  delete(studentId: string): Promise<boolean>;
}

function emptyDatabase(): MemoryDatabase {
  return { schemaVersion: 1, profiles: {} };
}

export class JsonFileLearningMemoryStore implements LearningMemoryStore {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(public readonly filePath: string) {}

  private async readDatabase(): Promise<MemoryDatabase> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<MemoryDatabase>;
      if (parsed.schemaVersion !== 1 || !parsed.profiles || typeof parsed.profiles !== 'object') {
        throw new Error('Öğrenme hafızası dosyasının şeması geçersiz.');
      }
      return parsed as MemoryDatabase;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return emptyDatabase();
      if (error instanceof SyntaxError) throw new Error('Öğrenme hafızası dosyası geçerli JSON değil.');
      throw error;
    }
  }

  private async writeDatabase(database: MemoryDatabase): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, JSON.stringify(database, null, 2), 'utf8');
    await rename(tempPath, this.filePath);
  }

  async get(studentId: string): Promise<LearningMemoryProfile | undefined> {
    await this.writeQueue.catch(() => undefined);
    const database = await this.readDatabase();
    return database.profiles[studentId];
  }

  async save(profile: LearningMemoryProfile): Promise<void> {
    const operation = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        const database = await this.readDatabase();
        database.profiles[profile.studentId] = profile;
        await this.writeDatabase(database);
      });
    this.writeQueue = operation;
    await operation;
  }

  async delete(studentId: string): Promise<boolean> {
    let deleted = false;
    const operation = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        const database = await this.readDatabase();
        if (!(studentId in database.profiles)) return;
        delete database.profiles[studentId];
        deleted = true;
        await this.writeDatabase(database);
      });
    this.writeQueue = operation;
    await operation;
    return deleted;
  }
}

export function createLearningMemoryStore(): LearningMemoryStore {
  const filePath = process.env.NESEVREN_MEMORY_FILE?.trim() || '.nesevren-data/learning-memory.json';
  return new JsonFileLearningMemoryStore(filePath);
}
