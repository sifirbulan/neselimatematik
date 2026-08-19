# Neş'eli Matematik AI

Türkiye müfredatı ve sınavlarına göre kişiselleştirilmiş matematik öğrenme platformu.

## Vizyon

Öğrencinin sorusunu analiz eden, matematiksel çözümü doğrulayan, seviyesine göre anlatan, ipucu/ses/video desteği sunan ve öğrencinin eksiklerine göre yeni testler üreten çoklu-AI eğitim platformu.

## İlk Mimari

- Web: React + TypeScript
- API: Node.js + TypeScript
- AI/Matematik servisleri: Python
- Veri: PostgreSQL
- AI Orchestrator: model ve araç seçimini yöneten katman
- Curriculum Knowledge Graph: sınıf, sınav, konu, kazanım ve ön koşul ilişkileri

## İlk MVP

1. Soru metni/görseli alma
2. Soru ön analizi
3. Matematik çözümü
4. Bağımsız çözüm doğrulama
5. Öğrenci seviyesine uygun açıklama ve ipuçları
6. Benzer soru üretimi
7. Online mini test
8. PDF test üretimi
9. Öğrenci performans profili

## Tasarım İlkeleri

- MEB/ÖSYM gibi birincil kaynaklar önceliklidir.
- AI çıktısı mümkün olduğunda matematiksel olarak bağımsız doğrulanır.
- Öğrenciye yalnızca cevap değil, öğrenme adımı verilir.
- AI sağlayıcıları orkestrasyon katmanından soyutlanır.
- Çocuk ve öğrenci verileri güvenlik ve gizlilik ilkeleriyle ele alınır.
