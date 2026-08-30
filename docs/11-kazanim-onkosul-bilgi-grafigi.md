# 11. Bölüm — Kazanım ve Önkoşul Bilgi Grafiği

Bu bölümde Nesevren, öğrencinin yaptığı hatayı yalnızca hedef kazanım içinde yorumlamak yerine hatanın daha eski bir matematik temelinden gelip gelmediğini araştırır.

## Amaç

Örneğin öğrenci denklem çözerken sürekli işaret hatası yapıyorsa sorun yalnızca `iki_tarafta_bilinmeyen` kazanımı olmayabilir. Sistem artık şu bağlantıyı kurabilir:

`dört işlem -> tam sayılar ve işaretler -> eşitlik dengesi -> denklem çözme`

Benzer biçimde parantezli denklemdeki bir hata `dağılma özelliği`, katsayı kaldırma hatası `çarpma-bölme ilişkisi`, ters işlem hatası ise `eşitlik dengesi` veya `ters işlem ilişkisi` önkoşuluna bağlanabilir.

## Yeni katman

```text
services/api/src/knowledge/
├── knowledge-model.ts
├── knowledge-graph.ts
├── prerequisite-diagnosis.ts
├── prerequisite-content.ts
└── knowledge-graph.test.ts
```

## Bilgi grafiği

Grafikte iki tür düğüm vardır:

- `foundation`: dört işlem, tam sayılar ve işaretler, ters işlem, eşitlik dengesi, çarpma-bölme ilişkisi, dağılma özelliği ve benzer terimler gibi temel bilgiler.
- `skill`: adaptif motorun kullandığı denklem kazanımları.

Her düğüm kendi doğrudan önkoşullarını taşır. Motor bu bağlantıları kullanarak doğrudan önkoşulları, bütün önkoşulları ve öğrenme yolunu çıkarabilir. Grafikte döngü oluşması da bütünlük kontrolünde hata kabul edilir.

## Kök neden analizi

`analyzePrerequisiteNeed` şu sinyalleri birlikte değerlendirir:

- hedef kazanım,
- hata türü,
- öğrencinin kazanım hâkimiyeti,
- son denemelerde aynı hatanın tekrarlanması,
- 10. bölümden gelen ilk hatalı çözüm adımı.

Sonuçta aday önkoşullar güven skoruyla sıralanır. En güçlü aday hedef kazanıma gerçekten bağlıysa `review_recommended` durumuna geçer.

Örnek:

```json
{
  "targetSkill": "parantezli_denklem",
  "status": "review_recommended",
  "recommended": {
    "node": { "id": "dagilma_ozelligi", "title": "Dağılma özelliği" },
    "confidence": 0.99,
    "pathToTarget": ["dagilma_ozelligi", "parantezli_denklem"]
  }
}
```

## Öğretmen Motoru entegrasyonu

Öğretmen planı artık `prerequisiteAnalysis` alanı içerir. Gerekli olduğunda ayrıca:

- hangi önkoşulun tekrar edilmesi gerektiği,
- kısa temel açıklama,
- ipuçları,
- önkoşula özel kontrol sorusu,
- hedef kazanıma geri dönüş bilgisi

üretilir.

Bu sayede Nesevren “bu soruyu yapamadın” demek yerine “bu hatanın altında tam sayılarda işaret bilgisi zayıf görünüyor; önce onu güçlendirelim” diyebilir.

## API

### Tüm bilgi grafiği

`GET /api/v1/knowledge/graph`

### Bir kazanımın önkoşulları

`GET /api/v1/knowledge/prerequisites/:skill`

### Öğrenci için kök önkoşul teşhisi

`POST /api/v1/knowledge/diagnose`

Örnek gövde:

```json
{
  "student": { "studentId": "ogrenci-1" },
  "skill": "parantezli_denklem",
  "correct": false,
  "question": "2(x + 3) = 14",
  "solutionSteps": ["2x + 3 = 14"]
}
```

## Pedagojik ilke

Bir hata doğrudan daha eski bir konuya bağlanmadan önce grafikte gerçek bir önkoşul yolu bulunmalıdır. Güven yetersizse sistem kesin hüküm vermek yerine `uncertain` sonucunu döndürür. Böylece öğrenci gereksiz yere sürekli eski konulara gönderilmez.

Bu katman ileride farklı derslere ve Türkiye Yüzyılı Maarif Modeli kazanım ilişkilerine genişletilebilecek şekilde ayrı bir bilgi grafiği olarak tutulmuştur.
