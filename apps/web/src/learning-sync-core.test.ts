import { describe, expect, it } from "vitest";
import { mergeErrorBooks, mergeLearningSnapshots, newerAssessment } from "./learning-sync-core";

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

  it("yerel ve bulut öğrenme anlık görüntülerini kayıpsız birleştirir", () => {
    const merged = mergeLearningSnapshots(
      { assessment: { createdAt: 10, level: "Gelişiyor" }, errorBook: [{ id: "yerel", lastSeenAt: 20 }] },
      { assessment: { createdAt: 30, level: "İyi" }, errorBook: [{ id: "bulut", lastSeenAt: 40 }] },
    );
    expect(merged.assessment?.level).toBe("İyi");
    expect(merged.errorBook.map(item => item.id)).toEqual(["bulut", "yerel"]);
  });
});
