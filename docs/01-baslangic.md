# Neş'eli Matematik AI — 01. Başlangıç

## Hedef

İlk aşamada çalışan en küçük sistemi kuracağız: öğrenci bir matematik sorusu gönderecek, sistem soruyu alıp analiz edecek ve sonucu daha sonra gerçek AI modellerine bağlanabilecek standart bir formatta döndürecek.

## Proje yol haritası

1. Proje iskeleti ve çalışma ortamı
2. Öğrenci web arayüzü
3. Soru alma: metin + görsel
4. AI Orchestrator
5. Soru analiz motoru
6. Matematik çözüm motoru
7. Bağımsız doğrulama
8. MEB/ÖSYM müfredat ve kazanım veri modeli
9. Öğrenci profili ve öğrenme hafızası
10. İpucu, mini konu anlatımı ve sesli anlatım
11. Soru/test üretimi
12. Online test ve PDF üretimi
13. Öğretmen paneli
14. Güvenlik, kalite, test ve yayına alma

## Bugünkü ilk adım

GitHub deposunun temel proje dokümantasyonunu oluşturduk. Bundan sonraki kodlama adımında web uygulamasını yerel bilgisayarda çalıştırılabilir hale getireceğiz.

## Yeni başlayan biri için önemli

Henüz hiçbir şeyi ezberlemene gerek yok. Her adımda:

- ne yaptığımızı,
- neden yaptığımızı,
- hangi dosyayı değiştirdiğimizi,
- nasıl çalıştıracağımızı,
- hata olursa ne yapacağımızı

tek tek anlatacağız.

## İlk teknik hedef

`apps/web` altında çalışan basit bir React + TypeScript uygulaması oluşturmak.

Bu uygulama ilk etapta yalnızca arayüz olacak. AI anahtarları ve gerçek model bağlantıları hemen eklenmeyecek. Önce sağlam bir temel kuracağız.
