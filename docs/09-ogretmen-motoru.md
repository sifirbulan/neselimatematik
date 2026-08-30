# 09 — Nesevren Öğretmen Motoru

Bu bölüm, adaptif soru motorunun yalnızca zorluk seçmesini değil; öğrencinin cevabını pedagojik olarak yorumlayıp bir sonraki öğretim adımını seçmesini sağlar.

## Amaç

Öğrenci yanlış yaptığında sistem sadece `yanlış` dememeli. Şu sırayı izlemelidir:

1. Hata türünü teşhis et.
2. Hatanın tekrar edip etmediğini kontrol et.
3. Öğrencinin kazanım hâkimiyetini dikkate al.
4. İpucu, kısa anlatım, çözülmüş örnek veya temel kazanıma dönüş seçeneklerinden uygun olanı seç.
5. Aynı kazanım için kısa bir kontrol sorusu ver.
6. Adaptif motorun önerdiği zorluk seviyesinde öğrenme döngüsünü sürdür.

## Öğretmen eylemleri

- `celebrate`: doğru cevap; kısa olumlu geri bildirim ve devam.
- `hint`: cevabı vermeden yönlendirici ipucu.
- `micro_explanation`: yalnızca gerekli kuralın kısa anlatımı.
- `worked_example`: benzer bir sorunun adım adım çözümü.
- `prerequisite_review`: hâkimiyet çok düşükse daha temel kurala dönüş.

## Teşhis sinyalleri

Motor şu verileri kullanır:

- kazanım (`skill`)
- mastery değeri
- son denemeler
- son hata türü
- aynı hatanın tekrar sayısı
- mevcut soru, öğrenci cevabı ve beklenen cevap (varsa)

Teşhisler kesin hüküm olarak değil olasılıklı öğretim kararı olarak tutulur ve `confidence` alanıyla birlikte döner.

## API

### Adaptif sonuç uç noktası

`POST /api/v1/adaptive/result`

Bu uç artık öğrenci modeli ve mastery yanında `teacherPlan` da döndürür.

İsteğe bağlı kanıt alanları:

```json
{
  "question": "x + 5 = 12",
  "studentAnswer": "17",
  "expectedAnswer": "7"
}
```

### Doğrudan öğretmen planı

`POST /api/v1/teacher/plan`

Güncel öğrenci modeli, kazanım, sonuç ve zorluk verilerek bağımsız öğretim planı üretilebilir.

## Örnek çıktı özeti

```json
{
  "action": "worked_example",
  "diagnosis": {
    "code": "ters_islem_hatasi",
    "confidence": 0.9
  },
  "feedback": {
    "headline": "Benzer bir örneği birlikte çözelim"
  },
  "teaching": {
    "goal": "Bilinmeyeni yalnız bırakmak...",
    "hints": ["..."],
    "workedExample": { "question": "x + 4 = 9" },
    "checkQuestion": { "prompt": "x - 3 = 8 denkleminde x kaçtır?" }
  },
  "next": {
    "retryRecommended": true,
    "shouldExplain": true
  }
}
```

## Mimari ilke

Bu katman dil modelinden bağımsızdır. OpenAI, Claude veya başka bir model ileride anlatım dilini zenginleştirebilir; ancak hangi pedagojik eylemin seçileceği Nesevren'in kendi kural tabanlı öğretmen motorunda kalır.

İlk sürüm yalnızca matematik / denklemler dikeyini kapsar. Sonraki adım, hata teşhisini gerçek soru çözüm adımlarından otomatik çıkaran çözüm analiz katmanıdır.
