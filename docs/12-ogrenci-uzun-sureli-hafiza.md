# 12. Bölüm — Öğrenci Uzun Süreli Hafıza ve Bilgi Profili

Bu bölümde Nesevren'in öğrenci bilgisini yalnızca tek bir API isteğinde taşıyan yapıdan, öğrencinin haftalar ve aylar boyunca gelişimini takip edebilen uzun süreli öğrenme hafızasına geçişi eklendi.

## Amaç

Nesevren artık yalnızca “bu soruda ne oldu?” sorusuna değil, şu sorulara da cevap verebilir:

- Öğrenci bu kazanımı daha önce kaç kez çalıştı?
- Uzun dönem doğruluk ve hâkimiyet oranı nedir?
- Son dönemde gelişiyor mu, geriliyor mu?
- Hangi hata türleri tekrarlanıyor?
- Bir kazanım uzun süredir çalışılmadığı için tekrar zamanı geldi mi?
- Hangi temel önkoşullarda tekrar eden risk sinyali var?
- Bir sonraki çalışma odağı ne olmalı?

## Hafıza modeli

`services/api/src/memory/` altında dört ana katman bulunur:

- `memory-model.ts`: uzun süreli profil, kazanım hafızası, temel riskleri ve tekrar kuyruğu tipleri.
- `memory-engine.ts`: hâkimiyet geçmişi, trend, kalıcılık skoru ve tekrar planı hesapları.
- `memory-store.ts`: kalıcı depolama sözleşmesi ve JSON dosya adaptörü.
- `memory-service.ts`: API ile depolama arasındaki servis katmanı.

Her öğrenci için saklanan profil şunları içerir:

- kazanım bazlı toplam deneme ve doğru sayıları,
- hâkimiyet ve doğruluk oranı,
- son hata ve hata türü sayaçları,
- doğru/yanlış serileri,
- son çalışma ve sonraki tekrar tarihi,
- gelişim trendi,
- son 30 hâkimiyet anlık görüntüsü,
- son 50 deneme kaydı,
- önkoşul bilgi grafiğinden gelen temel risk sinyalleri,
- önceliklendirilmiş tekrar kuyruğu.

## Kalıcılık ve unutma sinyali

Ham hâkimiyet değeri doğrudan silinmez. Bunun yerine son çalışma tarihine ve kazanımın istikrar süresine göre ayrı bir `retention` değeri hesaplanır.

Bu sayede öğrenci bir konuyu geçmişte çok iyi yapmış olsa bile aylarca çalışmadıysa Nesevren tekrar önerebilir. Öğrenci doğru yaptıkça istikrar süresi büyür; yanlış cevapta tekrar aralığı yeniden kısalır.

## Bilgi profili

`buildKnowledgeProfileSummary` çıktısı öğrencinin matematik profilini şu gruplara ayırır:

- `strengths`: güçlü ve kalıcılığı yüksek kazanımlar,
- `developing`: gelişmekte olan kazanımlar,
- `needsReview`: tekrar gerektiren kazanımlar,
- `foundationRisks`: 11. bölümdeki önkoşul grafiğinden gelen temel riskler,
- `nextFocus`: sıradaki en yüksek öncelikli çalışma.

## Adaptif motor entegrasyonu

### Yeni soru isterken

`POST /api/v1/adaptive/next-question`

İstek yalnızca `studentId` içeriyorsa Nesevren uzun süreli hafızayı yükler ve öğrenci modelini buradan yeniden kurar. Böylece istemcinin her istekte tüm öğrenci modelini taşıması zorunlu değildir.

Uzun süreli hafızadaki tekrar kuyruğu, öğrencinin `currentSkill` seçimine yansır. Böylece süresi gelmiş veya zayıf bir kazanım adaptif motorun odağına geri gelebilir.

### Sonuç kaydederken

`POST /api/v1/adaptive/result`

Her sonuçtan sonra:

1. mevcut adaptif öğrenci modeli güncellenir,
2. Öğretmen Motoru ve önkoşul teşhisi çalışır,
3. sonuç uzun süreli hafızaya yazılır,
4. hâkimiyet geçmişi ve hata sayıları güncellenir,
5. tekrar tarihi yeniden hesaplanır,
6. önkoşul riski varsa temel hafızasına eklenir,
7. yeni bilgi profili ve tekrar kuyruğu döndürülür.

Bu uç nokta artık tam `student` nesnesi yerine daha önce hafıza oluşturulmuş bir öğrenci için yalnızca `studentId` ile de çalışabilir.

## Yeni API uçları

### Öğrenme hafızasını getir

`GET /api/v1/memory/:studentId`

Profilin tamamını ve güncel bilgi profili özetini döndürür.

### Tekrar planını getir

`GET /api/v1/memory/:studentId/review-plan`

Sıradaki çalışma odağı, tekrar kuyruğu, güçlü kazanımlar, tekrar gerektiren kazanımlar ve temel riskleri döndürür.

### Öğrenme hafızasını sil

`DELETE /api/v1/memory/:studentId`

Öğrencinin uzun süreli öğrenme hafızasını siler. Kimlik doğrulama katmanı eklendiğinde bu uç yalnızca yetkili öğrenci/veli/öğretmen işlemlerine açılmalıdır.

## Depolama

Yeni bağımlılık eklenmedi. Varsayılan depolama, Node.js dosya sistemi üzerinde atomik JSON yazımı kullanan `JsonFileLearningMemoryStore` adaptörüdür.

Varsayılan dosya:

`.nesevren-data/learning-memory.json`

İstenirse ortam değişkeniyle değiştirilebilir:

`NESEVREN_MEMORY_FILE=/kalici/disk/learning-memory.json`

`.nesevren-data/` Git'e eklenmez.

### Üretim notu

JSON adaptörü ilk sürüm ve tek servis örneği için uygundur. Render gibi geçici dosya sistemine sahip ortamlarda gerçek uzun süreli kalıcılık için kalıcı disk bağlanmalı veya `LearningMemoryStore` arayüzüne PostgreSQL/Redis benzeri bir adaptör eklenmelidir. Hafıza motoru depolama teknolojisinden bağımsız tasarlandığı için bu geçişte pedagojik algoritmaların değiştirilmesi gerekmez.

## Pedagojik ilke

Nesevren geçmiş başarıyı sabit bir etiket olarak görmez. Hâkimiyet, tekrar, unutma, hata örüntüsü ve önkoşul sinyallerini birlikte değerlendirir. Amaç öğrenciyi “zayıf” veya “iyi” diye etiketlemek değil; bugün hangi çalışmanın en yararlı olacağını belirlemektir.
