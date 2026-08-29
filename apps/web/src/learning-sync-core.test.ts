import { describe, expect, it } from "vitest";
import { mergeErrorBooks, mergeLearningSnapshots, mergePerformanceRecords, newerAssessment } from "./learning-sync-core";

describe("learning sync core", () => {
  it("daha yeni seviye sonucunu korur", () => {
    const local = { createdAt: 200, score: 8 };
    const remote = { createdAt: 100, score: 5 };
    expect(newerAssessment(local, remote)).toEqual(local);
    expect(newerAssessment(remote, local)).toEqual(local);
  });

  it("hata kitapçığını id ile birleştirip en güncel kaydı seçer", () => {
    const merged = mergeErrorBooks(
      [
        { id: "a", lastSeenAt: 300, mistakeCount: 3 },
        { id: "b", lastSeenAt: 150, mistakeCount: 1 },
      ],
      [
        { id: "a", lastSeenAt: 200, mistakeCount: 2 },
        { id: "c", lastSeenAt: 250, mistakeCount: 1 },
      ],
    );
    expect(merged.map(item => item.id)).toEqual(["a", "c", "b"]);
    expect(merged.find(item => item.id === "a")?.mistakeCount).toBe(3);
  });

  it("deneme performans kayıtlarını id ile kayıpsız birleştirir", () => {
    const merged = mergePerformanceRecords(
      [
        { id: "p1", date: "2026-08-20", updatedAt: 300, totalNet: 70 },
        { id: "p2", date: "2026-08-25", updatedAt: 250, totalNet: 75 },
      ],
      [
        { id: "p1", date: "2026-08-20", updatedAt: 200, totalNet: 68 },
        { id: "p3", date: "2026-08-28", updatedAt: 400, totalNet: 80 },
      ],
    );
    expect(merged.map(item => item.id)).toEqual(["p3", "p1", "p2"]);
    expect(merged.find(item => item.id === "p1")?.totalNet).toBe(70);
  });

  it("yerel ve bulut öğrenme anlık görüntülerini kayıpsız birleştirir", () => {
    const merged = mergeLearningSnapshots(
      { assessment: { createdAt: 10, level: "Gelişiyor" }, errorBook: [{ id: "yerel", lastSeenAt: 20 }], performance: [{ id: "p-yerel", updatedAt: 25 }] },
      { assessment: { createdAt: 30, level: "İyi" }, errorBook: [{ id: "bulut", lastSeenAt: 40 }], performance: [{ id: "p-bulut", updatedAt: 50 }] },
    );
    expect(merged.assessment?.level).toBe("İyi");
    expect(merged.errorBook.map(item => item.id)).toEqual(["bulut", "yerel"]);
    expect(merged.performance.map(item => item.id)).toEqual(["p-bulut", "p-yerel"]);
  });
});
