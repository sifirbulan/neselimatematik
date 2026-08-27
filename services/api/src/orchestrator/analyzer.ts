import type { ExamType, QuestionAnalysis, StudentQuestion } from "./types.js";

function detectExam(text: string): ExamType {
  const value = text.toLocaleLowerCase("tr-TR");
  if (value.includes("lgs")) return "LGS";
  if (value.includes("tyt")) return "TYT";
  if (value.includes("ayt")) return "AYT";
  if (value.includes("kpss")) return "KPSS";
  if (value.includes("ales")) return "ALES";
  return "NONE";
}

function contentOnly(text: string): string {
  return text
    .replace(/Kullanıcının seçtiği ders:[^.\n]*\.?/gi, " ")
    .replace(/Bu seçim yalnızca bir ipucudur ve yanlış olabilir\.?/gi, " ")
    .replace(/Kullanıcı ders seçmedi\.?/gi, " ")
    .replace(/Her durumda sorunun gerçek dersini[\s\S]*?gerçek dersi esas al\.?/gi, " ")
    .replace(/Örneğin kullanıcı Kimya seçip matematik sorusu gönderirse bunu Matematik olarak çöz\.?/gi, " ")
    .replace(/Öğrencinin seviyesine uygun, kavramsal anlamayı ve çözüm mantığını öne çıkaran açık ve öğretici bir anlatım kullan\.?/gi, " ")
    .trim();
}

function detectTopic(text: string): { topic: string; subtopic: string } {
  const clean = contentOnly(text);
  const value = clean.toLocaleLowerCase("tr-TR");

  if (/\b(english|ingilizce|grammar|vocabulary|tense|passive voice|relative clause)\b/i.test(value)) return { topic: "İngilizce", subtopic: "Dil Becerileri" };
  if (/\b(kürtçe|kurmanc[iî]|zazak[iî]|soran[iî]|kurdî|kurdçe)\b/i.test(value)) return { topic: "Kürtçe", subtopic: "Dil Becerileri" };
  if (/(şiir|roman|hikâye|hikaye|edebiyat|söz sanat|fiil|isim|zarf|cümle|paragraf|anlatım)/i.test(value)) return { topic: value.includes("edebiyat") ? "Türk Dili ve Edebiyatı" : "Türkçe", subtopic: "Dil ve Anlam" };
  if (/(atom|molekül|mol |asit|baz|kimyasal|periyodik|element|bileşik|tepkime)/i.test(value)) return { topic: "Kimya", subtopic: "Genel Kimya" };
  if (/(kuvvet|hız|ivme|enerji|elektrik|manyetik|optik|basınç|fizik)/i.test(value)) return { topic: "Fizik", subtopic: "Temel Fizik" };
  if (/(hücre|dna|rna|genetik|fotosentez|solunum|ekosistem|canlı|biyoloji)/i.test(value)) return { topic: "Biyoloji", subtopic: "Canlılar ve Yaşam" };
  if (/(tarih|osmanlı|selçuklu|cumhuriyet|inkılap|savaş|antlaşma)/i.test(value)) return { topic: "Tarih", subtopic: "Tarihsel Süreç" };
  if (/(coğrafya|iklim|harita|nüfus|yer şekilleri|akarsu|bölge)/i.test(value)) return { topic: "Coğrafya", subtopic: "İnsan ve Doğa" };
  if (/(felsefe|filozof|bilgi felsefesi|ahlak|etik|varlık felsefesi|mantık)/i.test(value)) return { topic: "Felsefe", subtopic: "Felsefi Düşünme" };
  if (/(fen bilimleri|madde|ısı|ışık|dünya|güneş|gezegen)/i.test(value)) return { topic: "Fen Bilimleri", subtopic: "Genel Fen" };

  if (value.includes("türev") || value.includes("turev")) return { topic: "Matematik", subtopic: "Türev" };
  if (value.includes("integral")) return { topic: "Matematik", subtopic: "İntegral" };
  if (value.includes("limit")) return { topic: "Matematik", subtopic: "Limit" };
  if (value.includes("üçgen") || value.includes("ucgen") || value.includes("geometri")) return { topic: "Matematik", subtopic: "Geometri" };
  if (value.includes("denklem") || /[a-z]\s*[+\-*/=]/i.test(clean)) return { topic: "Matematik", subtopic: "Denklemler" };
  if (value.includes("olasılık") || value.includes("olasilik")) return { topic: "Matematik", subtopic: "Olasılık" };
  if (/\d/.test(clean) && /[+\-*/=<>]/.test(clean)) return { topic: "Matematik", subtopic: "Genel" };
  return { topic: "Genel", subtopic: "Ders AI tarafından belirlenecek" };
}

export function analyzeQuestion(input: StudentQuestion): QuestionAnalysis {
  const question = input.question.trim();
  const { topic, subtopic } = detectTopic(question);
  const exam = input.exam && input.exam !== "NONE" ? input.exam : detectExam(contentOnly(question));
  const cleanLength = contentOnly(question).length;
  const difficulty = cleanLength > 320 ? "hard" : cleanLength > 140 ? "medium" : cleanLength ? "easy" : "unknown";

  return {
    topic,
    subtopic,
    exam,
    difficulty,
    needsVision: input.inputType === "image",
    needsVerification: topic === "Matematik",
    confidence: topic === "Genel" ? 0.5 : difficulty === "hard" ? 0.58 : 0.78,
  };
}
