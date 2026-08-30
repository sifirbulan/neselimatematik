# 10. Bölüm — Çözüm Adımı Analiz Motoru

Bu bölümde Nesevren, öğrencinin yalnızca son cevabını değil çözüm sırasında yazdığı matematiksel adımları da analiz eder.

## Amaç

Öğrenci bir denklem çözerken örneğin şu adımları yazabilir:

```text
2x + 5 = 17
2x = 22
x = 11
```

Eski yaklaşım yalnızca sonucun yanlış olduğunu ve dışarıdan verilen bir `mistake` kodunu kullanıyordu. Yeni motor, ilk hatanın `2x = 22` satırında oluştuğunu kendi belirler ve bunu `ters_islem_hatasi` olarak sınıflandırır.

## Yeni akış

```text
Başlangıç denklemi
      ↓
Öğrenci çözüm satırları
      ↓
Doğrusal ifade ayrıştırıcı
      ↓
Her iki ardışık satırın çözüm kümesini karşılaştır
      ↓
İlk bozuk dönüşümü bul
      ↓
Hata türünü çıkar
      ↓
Öğretmen Motoru'na satır + hata + ipucu gönder
```

## Desteklenen matematik

İlk sürüm `x` değişkenli birinci dereceden denklemler için tasarlanmıştır. Ayrıştırıcı şunları destekler:

- toplama ve çıkarma
- çarpma ve bölme
- `2x` ve `2*x` yazımı
- parantezler
- negatif sayılar
- ondalık sayılar
- eşdeğer denklem dönüşümleri

Doğrusal olmayan `x*x` gibi ifadeler bilinçli olarak reddedilir.

## Hata sınıfları

Motor ilk bozuk adımı aşağıdaki mevcut Nesevren hata sınıflarından biriyle eşler:

- `ters_islem_hatasi`
- `isaret_hatasi`
- `carpma_bolme_hatasi`
- `dagilma_hatasi`
- `hesaplama_hatasi`
- `bilinmiyor`

İlk hata bulunduktan sonraki satırlar `unverified` olarak işaretlenir. Bunun nedeni, yanlış bir satırdan sonra yapılan işlemlerin kendi içinde tutarlı olsa bile artık başlangıç sorusunun doğru çözümünü temsil etmeyebilmesidir.

## API

### Çözüm adımlarını bağımsız analiz et

`POST /api/v1/solutions/analyze-steps`

Örnek istek:

```json
{
  "question": "2x + 5 = 17",
  "steps": ["2x = 22", "x = 11"]
}
```

Yanıt ilk hata satırını, hata türünü, nedeni, düzeltici ipucunu ve tüm geçişlerin durumunu içerir.

### Öğretmen motoru entegrasyonu

`POST /api/v1/teacher/plan` ve `POST /api/v1/adaptive/result` isteklerine artık isteğe bağlı olarak şu alan eklenebilir:

```json
{
  "solutionSteps": ["2x = 22", "x = 11"]
}
```

`question` alanı da gönderildiğinde Nesevren çözüm adımlarını analiz eder. Kullanıcı ayrıca `mistake` göndermese bile motor ilk hatadan hata türünü otomatik çıkarır ve Öğretmen Motoru buna göre ipucu/anlatım seçer.

## Pedagojik ilke

Amaç öğrencinin yalnızca yanlış sonuca ulaştığını söylemek değildir. Nesevren mümkün olduğunda:

1. ilk yanlış satırı bulur,
2. o satırın neden önceki denklemle eşdeğer olmadığını açıklar,
3. cevabı doğrudan vermeden düzeltici bir ipucu üretir,
4. sonraki öğretim kararını bu gerçek hataya göre verir.

Bu katman kural tabanlıdır. İleride bir dil modeli veya sembolik matematik servisi daha geniş ifade türlerini destekleyebilir; ancak adım doğrulama sonucu ve pedagojik karar Nesevren'in kendi denetlenebilir katmanında kalır.
