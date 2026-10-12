import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { advanceEducationRecord, type LifelongEducationRecord } from './education-history';

interface EducationDatabase {
  schemaVersion: 1;
  records: Record<string, LifelongEducationRecord>;
}

export class JsonFileEducationStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(readonly filePath: string) {}

  private async read(): Promise<EducationDatabase> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        (parsed as EducationDatabase).schemaVersion !== 1 ||
        !(parsed as EducationDatabase).records ||
        typeof (parsed as EducationDatabase).records !== 'object' ||
        Array.isArray((parsed as EducationDatabase).records)) {
        throw new Error('Eğitim geçmişi dosyasının şeması geçersiz.');
      }
      return parsed as EducationDatabase;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, records: {} };
      throw error;
    }
  }

  async get(studentId: string): Promise<LifelongEducationRecord | undefined> {
    await this.queue.catch(() => undefined);
    return (await this.read()).records[studentId];
  }

  async advance(input: unknown): Promise<{ record?: LifelongEducationRecord; error?: string }> {
    let result: { record?: LifelongEducationRecord; error?: string } = {};
    const operation = this.queue.catch(() => undefined).then(async () => {
      const database = await this.read();
      const id = input && typeof input === 'object' && 'studentId' in input
        ? (input as { studentId: unknown }).studentId : undefined;
      const existing = typeof id === 'string' ? database.records[id.trim()] : undefined;
      result = advanceEducationRecord(existing, input);
      if (!result.record || result.record === existing) return;
      database.records[result.record.studentId] = result.record;
      await mkdir(dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tempPath, JSON.stringify(database, null, 2), 'utf8');
      await rename(tempPath, this.filePath);
    });
    this.queue = operation;
    await operation;
    return result;
  }
}

export function createEducationStore(): JsonFileEducationStore {
  return new JsonFileEducationStore(process.env.NESEVREN_EDUCATION_FILE?.trim() || '.nesevren-data/education-history.json');
}
