# Neşevren canlı bağlantı kontrolü

## Web → API

Web uygulaması varsayılan olarak `https://nesevren-api-v2.onrender.com` adresini kullanır. Başka API dağıtımı için **web build sırasında** `VITE_API_BASE_URL` ayarlayın (sonunda / olmadan).

API servisinde aşağıdaki değişkenler bulunmalıdır:

| Değişken | Amaç |
| --- | --- |
| `NESEVREN_AI_API_KEY` | Sunucu tarafında gizli yapay zekâ anahtarı |
| `NESEVREN_AI_MODEL` | Metin soru yanıt modeli (OpenAI chat completions uyumlu) |
| `NESEVREN_VISION_MODEL` | Fotoğraf soru okuma modeli (görsel desteklemeli) |
| `PORT` | Render tarafından verilir |

Anahtarları **GitHub'a, web ortam değişkenlerine veya istemci koduna koymayın**. Render servis ayarlarında secret/environment variable olarak saklayın.

## Canlı doğrulama

1. `GET https://nesevren-api-v2.onrender.com/health` → `status: ok` beklenir.
2. Web ekranında **Matematik, 7. sınıf** seçin, `2x+3=x+7` yazın ve çözün. Doğrulanmış `x = 4` yanıtı beklenir (AI anahtarı gerektirmez).
3. Biyoloji sorusu deneyin. AI ayarları yoksa açık yapılandırma hatası beklenir. Ayarlar varsa yanıtın `verified: false` olması gerekir.
4. Fotoğraf seçin. Görsel okuma ayarları yoksa açık hata beklenir. Varsa metin gösterilmeli, kullanıcı **Soruyu Onayla ve Çöz** diyene kadar çözüm başlamamalıdır.
5. Masaüstü ve telefonda yükleme, hata ve düzeltme akışlarını kontrol edin.

## Bilinen sınırlamalar

- Fotoğraf okuma ve genel ders cevapları için ücretli/harici model yapılandırması gereklidir.
- İkinci AI değerlendirmesi bağımsız doğrulama değildir.
- Gerçek Render ayarları ve dağıtım durumu yalnızca Render hesabı erişimiyle kesin olarak doğrulanabilir.
- Uçtan uca tarayıcı testleri ve üretim yük testleri henüz eklenmemiştir.
