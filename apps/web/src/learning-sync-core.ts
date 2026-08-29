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

export type LearningSnapshot = {
  assessment: LearningAssessment;
  errorBook: LearningErrorItem[];
};

function timestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function newerAssessment(local: LearningAssessment, remote: LearningAssessment): LearningAssessment {
  if (!local) return remote ?? null;
  if (!remote) return local;
  return timestamp(local.createdAt) >= timestamp(remote.createdAt) ? local : remote;
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
    const itemTime = Math.max(timestamp(item.lastSeenAt), timestamp(item.createdAt));
    const currentTime = Math.max(timestamp(current.lastSeenAt), timestamp(current.createdAt));
    if (itemTime > currentTime || (preferOnTie && itemTime === currentTime)) merged.set(item.id, item);
  };
  remote.forEach(item => put(item));
  local.forEach(item => put(item, true));
  return [...merged.values()].sort((a, b) => {
    const aTime = Math.max(timestamp(a.lastSeenAt), timestamp(a.createdAt));
    const bTime = Math.max(timestamp(b.lastSeenAt), timestamp(b.createdAt));
    return bTime - aTime;
  });
}

export function mergeLearningSnapshots(local: LearningSnapshot, remote: LearningSnapshot): LearningSnapshot {
  return {
    assessment: newerAssessment(local.assessment, remote.assessment),
    errorBook: mergeErrorBooks(local.errorBook, remote.errorBook),
  };
}
