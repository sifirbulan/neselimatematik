import type { StudentIntent } from "./types.js";

export function buildIntentGuidance(intent: StudentIntent): string[] {
  if (intent === "hint") {
    return [
      "Bu istek yalnızca ipucu içindir.",
      "Doğrudan cevabı, doğru şıkkı veya nihai sayısal sonucu söyleme.",
      "Tam çözümü bitirme; öğrencinin ilk doğru adımı kendisinin bulmasını sağlayacak kısa bir yönlendirme yap.",
      "JSON alanlarını koru: answer alanına 'Gizli' yaz, explanation ve steps alanlarını kısa tut, asıl yönlendirmeyi hint alanında ver.",
    ];
  }
  return ["Öğrencinin seviyesine uygun, gereksiz uzun olmayan bir çözüm üret."];
}
