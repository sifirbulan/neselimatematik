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
  if (intent === "generate_test") {
    return [
      "Bu istek uygulama tarafından makineyle ayrıştırılacak test verisi üretir; answer alanındaki JSON kesinlikle geçerli olmalıdır.",
      "answer alanına kullanıcının istediği JSON dizi dışında açıklama, Markdown kod bloğu veya ek metin yazma.",
      "Test sorularının question, options, hint ve topic metinlerinde LaTeX komutu ve ters eğik çizgi kullanma.",
      "Matematiksel gösterimde JSON-güvenli Unicode sembolleri tercih et: √, ×, ÷, π, ∠, °, ≤, ≥, ≠. Üslerde mümkünse ², ³ gibi karakterleri; gerekirse x^4 biçimini kullan.",
      "Köklü ifadeyi doğrudan √12 biçiminde yaz. Kesir gerekiyorsa 3/5 gibi açık metin kullan.",
      "Soruları ve şıkları gereksiz uzatma; özellikle 40 soruluk testlerde her nesneyi kısa ve tek anlamlı tut.",
    ];
  }
  return ["Öğrencinin seviyesine uygun, gereksiz uzun olmayan bir çözüm üret."];
}
