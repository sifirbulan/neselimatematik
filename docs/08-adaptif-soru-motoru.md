# 08 — Adaptif Soru Motoru

Bu bölüm Nesevren'in öğrencinin performansına göre bir sonraki soruyu seçen ilk kural tabanlı adaptif motorunu tanımlar.

## Hedef

Soru üretimini rastgele olmaktan çıkarıp şu döngüye bağlamak:

`öğrenci modeli -> kazanım seçimi -> zorluk kararı -> soru üretimi -> sonuç kaydı -> güncellenmiş öğrenci modeli`

İlk sürüm yalnızca **matematik / denklemler** alanını kapsar. Yapı daha sonra diğer matematik konularına ve derslere genişletilecek şekilde modüllere ayrılmıştır.

## Zorluk politikası

Son aynı kazanımdaki 5 deneme esas alınır:

- 5/5 doğru: zorluk 1 kademe artar.
- 4/5 doğru: aynı kazanımda zorluk 1 kademe artar.
- 3/5 doğru: seviye korunur.
- 2/5 doğru: zorluk 1 kademe azalır.
- 0–1/5 doğru: zorluk azalır ve yeni sorudan önce kısa konu anlatımı önerilir.

Beş deneme oluşmadan önce kazanım hâkimiyet puanı (`mastery`, 0–1) kullanılır.

## Öğrenci modeli

Motor her kazanım için şunları tutar:

- hâkimiyet puanı,
- toplam deneme,
- doğru sayısı,
- son zorluk seviyesi,
- son hata türü,
- son 20 denemenin özeti.

Bu aşamada API öğrenci modelini veritabanına yazmaz. İstemci/orchestrator dönen modeli bir sonraki istekte geri gönderir. PostgreSQL kalıcılığı ayrı bir bölümde eklenebilir.

## API

### Yeni soru

`POST /api/v1/adaptive/next-question`

İlk istek örneği:

```json
{
  "studentId": "ogrenci-123",
  "grade": 7
}
```

Sonraki isteklerde önceki yanıttan dönen `student` modeli gönderilebilir.

### Sonuç kaydetme

`POST /api/v1/adaptive/result`

```json
{
  "student": { "...": "next-question yanıtındaki öğrenci modeli" },
  "skill": "bilinmeyeni_yalniz_birakma",
  "difficulty": 2,
  "correct": false,
  "mistake": "ters_islem_hatasi"
}
```

`correct` bilgisinin matematik doğrulayıcı/orchestrator tarafından güvenilir biçimde üretilmesi beklenir. Adaptif motor öğrencinin cevabını kendi başına doğrulamaz.

## Dosyalar

- `src/student/student-model.ts`: öğrenci ve kazanım veri modeli
- `src/student/mastery.ts`: hâkimiyet güncelleme kuralları
- `src/student/mistake-analysis.ts`: hata türü normalizasyonu
- `src/adaptive/difficulty-engine.ts`: 5 soruluk performans politikası
- `src/adaptive/next-skill-selector.ts`: sıradaki kazanım seçimi
- `src/adaptive/question-generator.ts`: ilk kural tabanlı denklem üreticisi
- `src/adaptive/adaptive-engine.ts`: adaptif akışın orkestrasyonu

## Sonraki adım

9. bölümde bu motorun önüne **Nesevren Öğretmen Motoru** eklenerek `shouldExplain` kararı gerçek konu anlatımı, ipucu ve öğretim stratejisine dönüştürülebilir.
