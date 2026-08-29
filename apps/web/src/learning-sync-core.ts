export type LearningAssessment = {
  createdAt?: number;
  [key: string]: unknown;
} | null;

export type LearningErrorItem = {
  id: string;
  createdAt?: number;
  lastSeenAt?: number;
  [key: string]: unknown;
};

export type LearningPerformanceItem = {
  id: string;
  createdAt?: number;
  updatedAt?: number;
  date?: string;
  [key: string]: unknown;
};

export type LearningCoachData = {
  profile?: Record<string, unknown> | null;
  tasks?: Array<Record<string, unknown>>;
  checkins?: Array<Record<string, unknown>>;
  updatedAt?: number;
} | null;

export type LearningSnapshot = {
  assessment: LearningAssessment;
  errorBook: LearningErrorItem[];
  performance: LearningPerformanceItem[];
  coachData: LearningCoachData;
};

function timestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function itemTimestamp(item: { createdAt?: number; updatedAt?: number; lastSeenAt?: number; date?: string }) {
  const dateTime = typeof item.date === "string" ? Date.parse(item.date) : 0;
  return Math.max(timestamp(item.updatedAt), timestamp(item.lastSeenAt), timestamp(item.createdAt), Number.isFinite(dateTime) ? dateTime : 0);
}

export function newerAssessment(local: LearningAssessment, remote: LearningAssessment): LearningAssessment {
  if (!local) return remote ?? null;
  if (!remote) return local;
  return timestamp(local.createdAt) >= timestamp(remote.createdAt) ? local : remote;
}

export function newerCoachData(local: LearningCoachData, remote: LearningCoachData): LearningCoachData {
  if (!local) return remote ?? null;
  if (!remote) return local;
  return timestamp(local.updatedAt) >= timestamp(remote.updatedAt) ? local : remote;
}

export function mergeErrorBooks(local: LearningErrorItem[], remote: LearningErrorItem[]): LearningErrorItem[] {
  const merged = new Map<string, LearningErrorItem>();
  const put = (item: LearningErrorItem, preferOnTie = false) => {
    if (!item?.id) return;
    const current = merged.get(item.id);
    if (!current) {
      merged.set(item.id, item);
      return;
    }
    const itemTime = itemTimestamp(item);
    const currentTime = itemTimestamp(current);
    if (itemTime > currentTime || (preferOnTie && itemTime === currentTime)) merged.set(item.id, item);
  };
  remote.forEach(item => put(item));
  local.forEach(item => put(item, true));
  return [...merged.values()].sort((a, b) => itemTimestamp(b) - itemTimestamp(a));
}

export function mergePerformanceRecords(local: LearningPerformanceItem[], remote: LearningPerformanceItem[]): LearningPerformanceItem[] {
  const merged = new Map<string, LearningPerformanceItem>();
  const put = (item: LearningPerformanceItem, preferOnTie = false) => {
    if (!item?.id) return;
    const current = merged.get(item.id);
    if (!current) {
      merged.set(item.id, item);
      return;
    }
    const itemTime = itemTimestamp(item);
    const currentTime = itemTimestamp(current);
    if (itemTime > currentTime || (preferOnTie && itemTime === currentTime)) merged.set(item.id, item);
  };
  remote.forEach(item => put(item));
  local.forEach(item => put(item, true));
  return [...merged.values()].sort((a, b) => itemTimestamp(b) - itemTimestamp(a));
}

export function mergeLearningSnapshots(local: LearningSnapshot, remote: LearningSnapshot): LearningSnapshot {
  return {
    assessment: newerAssessment(local.assessment, remote.assessment),
    errorBook: mergeErrorBooks(local.errorBook, remote.errorBook),
    performance: mergePerformanceRecords(local.performance, remote.performance),
    coachData: newerCoachData(local.coachData, remote.coachData),
  };
}
