export const gradeLevels=["1","2","3","4","5","6","7","8","9","10","11","12","Mezun / YKS","KPSS / ALES"] as const;

const geographyUnits=["Genel Tarama","Coğrafyanın Doğası","Mekânsal Bilgi Teknolojileri","Doğal Sistemler ve Süreçler","Beşerî Sistemler ve Süreçler","Ekonomik Faaliyetler ve Etkileri","Afetler ve Sürdürülebilir Çevre","Bölgeler, Ülkeler ve Küresel Bağlantılar"];
const englishSkills=["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary and Language Use"];
const kurdishSkills=["Genel Tarama","Dinleme ve Anlama","Konuşma","Okuma","Yazma","Kelime Bilgisi ve Dil Kullanımı"];
const arabicSkills=["Genel Tarama","Dinleme ve Anlama","Konuşma","Okuma","Yazma","Kelime Bilgisi ve Dil Kullanımı"];

const curriculum:Record<string,Record<string,string[]>>={
  Matematik:{
    "1":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","Sayılar ve Nicelikler (3)","İşlemlerden Cebirsel Düşünmeye","Nesnelerin Geometrisi (1)","Nesnelerin Geometrisi (2)","Veriye Dayalı Araştırma"],
    "2":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","İşlemlerden Cebirsel Düşünmeye","Nesnelerin Geometrisi (1)","Nesnelerin Geometrisi (2)","Veriye Dayalı Araştırma"],
    "3":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","İşlemlerden Cebirsel Düşünmeye","Nesnelerin Geometrisi (1)","Nesnelerin Geometrisi (2)","Veriye Dayalı Araştırma"],
    "4":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","İşlemlerden Cebirsel Düşünmeye","Nesnelerin Geometrisi (1)","Nesnelerin Geometrisi (2)","Nesnelerin Geometrisi (3)","Olayların Olasılığı ve Veriye Dayalı Araştırma"],
    "5":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","İşlemlerle Cebirsel Düşünme","Geometrik Şekiller","Geometrik Nicelikler","İstatistiksel Araştırma Süreci","Veriden Olasılığa"],
    "6":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","İşlemlerle Cebirsel Düşünme ve Değişimler","Geometrik Şekiller","Geometrik Nicelikler","İstatistiksel Araştırma Süreci","Veriden Olasılığa"],
    "7":["Genel Tarama","Sayılar ve Nicelikler (1)","Sayılar ve Nicelikler (2)","İşlemlerle Cebirsel Düşünme ve Değişimler","Dönüşüm","Geometrik Nicelikler (1)","Geometrik Nicelikler (2)","Geometrik Şekiller","İstatistiksel Araştırma Süreci","Veriden Olasılığa"],
    "8":["Genel Tarama","Sayılar ve Nicelikler","Cebirsel Düşünme ve Değişimler","Geometrik Şekiller","Geometrik Nicelikler","Dönüşüm","İstatistiksel Araştırma Süreci","Veriden Olasılığa"],
    "9":["Genel Tarama","Sayılar","Nicelikler ve Değişimler","Geometrik Şekiller","Eşlik ve Benzerlik","Algoritma ve Bilişim","İstatistiksel Araştırma Süreci","Veriden Olasılığa"],
    "10":["Genel Tarama","Geometrik Şekiller","İstatistiksel Araştırma Süreci","Sayılar","Nicelikler ve Değişimler","Sayma, Algoritma ve Bilişim","Analitik İnceleme","Veriden Olasılığa"],
    "11":["Genel Tarama","İstatistiksel Araştırma Süreci","Geometrik Şekiller","Nicelikler ve Değişimler (1)","Nicelikler ve Değişimler (2)","Nicelikler ve Değişimler (3)"],
    "12":["Genel Tarama","Nicelikler ve Değişimler (1)","Nicelikler ve Değişimler (2)","Geometrik Şekiller","Geometrik Cisimler","Değişimin Matematiği (1)","Değişimin Matematiği (2)","Değişimin Matematiği (3)","Hazır Veriler Üzerinde Çalışma"],
    "Mezun / YKS":["Genel Tarama","TYT Matematik","AYT Matematik","Geometri","Fonksiyonlar","Trigonometri","Limit","Türev","İntegral"],
    "KPSS / ALES":["Genel Tarama","Temel Kavramlar","Sayılar","Problemler","Oran-Orantı","Cebir","Geometri","Veri ve Mantık"]
  },
  Türkçe:{
    "1":["Genel Tarama","Güzel Davranışlarımız","Mustafa Kemal’den Atatürk’e","Çevremizdeki Yaşam","Yol Arkadaşımız Kitaplar","Yeteneklerimizi Keşfediyoruz","Minik Kâşifler","Atalarımızın İzleri","Sorumluluklarımızın Farkındayız"],
    "2":["Genel Tarama","Değerlerimizle Varız","Atatürk ve Çocuk","Doğada Neler Oluyor?","Okuma Serüvenimiz","Yeteneklerimizi Tanıyoruz","Mucit Çocuk","Kültür Hazinemiz","Haklarımızı Biliyoruz"],
    "3":["Genel Tarama","Değerlerimizle Yaşıyoruz","Atatürk ve Kahramanlarımız","Doğayı Tanıyoruz","Bilgi Hazinemiz","Yeteneklerimizi Kullanıyoruz","Bilim Yolculuğu","Millî Kültürümüz","Hak ve Sorumluluklarımız"],
    "4":["Genel Tarama","Erdemler","Millî Mücadele ve Atatürk","Doğa ve İnsan","Kütüphanemiz","Kendimizi Geliştiriyoruz","Bilim ve Teknoloji","Geçmişten Geleceğe Mirasımız","Demokratik Yaşam"],
    "5":["Genel Tarama","Oyun Dünyası","Atatürk’ü Tanımak","Duygularımı Tanıyorum","Geleneklerimiz","İletişim ve Sosyal İlişkiler","Sağlıklı Yaşıyorum"],
    "6":["Genel Tarama","Dilimizin Zenginliği","Bağımsızlık Yolu","Farklı Dünyalar","İletişim ve Sosyal İlişkiler","Bilim ve Teknoloji","Lider Ruhlar"],
    "7":["Genel Tarama","Hayat Boyu Gelişim","Bir Hilal Uğruna","İletişim ve Sosyal İlişkiler","Türk Sanatı","Okuma Kültürü","Hak ve Sorumluluklar"],
    "8":["Genel Tarama","İletişim ve Sosyal İlişkiler","Vatan Sevgisi","Doğa ve İnsan","Türk Hikâye Geleneği ve Destanları","Sanat ve Estetik","Akademik Düşünme Dünyası"]
  },
  "Fen Bilimleri":{
    "3":["Genel Tarama","Dünya ve Evren","Canlılar ve Yaşam","Fiziksel Olaylar","Madde ve Doğası"],
    "4":["Genel Tarama","Dünya ve Evren","Canlılar ve Yaşam","Fiziksel Olaylar","Madde ve Doğası"],
    "5":["Genel Tarama","Gökyüzündeki Komşularımız ve Biz","Kuvveti Tanıyalım","Canlıların Yapısına Yolculuk","Işığın Dünyası","Maddenin Doğası","Elektrik Devre Elemanları","Sürdürülebilir Yaşam ve Geri Dönüşüm"],
    "6":["Genel Tarama","Güneş Sistemi ve Tutulmalar","Kuvvetin Etkisinde Hareket","Canlılarda Sistemler","Işığın Yansıması ve Renkler","Maddenin Ayırt Edici Özellikleri","Elektriğin İletimi ve Direnç","Sürdürülebilir Yaşam ve Etkileşim"],
    "7":["Genel Tarama","Dünya ve Evren","Kuvvet ve Enerji","Canlılarda Yapı ve Sistemler","Işık","Madde","Elektrik","Sürdürülebilir Yaşam"],
    "8":["Genel Tarama","Mevsimler ve İklim","DNA ve Genetik Kod","Basınç","Madde ve Endüstri","Basit Makineler","Enerji Dönüşümleri ve Çevre Bilimi","Elektrik Yükleri ve Elektrik Enerjisi"]
  },
  "Sosyal Bilgiler":{
    "4":["Genel Tarama","Birlikte Yaşamak","Evimiz Dünya","Ortak Mirasımız","Yaşayan Demokrasimiz","Hayatımızdaki Ekonomi","Teknoloji ve Sosyal Bilimler"],
    "5":["Genel Tarama","Birlikte Yaşamak","Evimiz Dünya","Ortak Mirasımız","Yaşayan Demokrasimiz","Hayatımızdaki Ekonomi","Teknoloji ve Sosyal Bilimler"],
    "6":["Genel Tarama","Birlikte Yaşamak","Evimiz Dünya","Ortak Mirasımız","Yaşayan Demokrasimiz","Hayatımızdaki Ekonomi","Teknoloji ve Sosyal Bilimler"],
    "7":["Genel Tarama","Birlikte Yaşamak","Evimiz Dünya","Ortak Mirasımız","Yaşayan Demokrasimiz","Hayatımızdaki Ekonomi","Teknoloji ve Sosyal Bilimler"]
  },
  Fizik:{"9":["Genel Tarama","Fizik Bilimi ve Kariyer Keşfi","Kuvvet ve Hareket","Akışkanlar","Enerji"],"10":["Genel Tarama","Kuvvet ve Hareket","Enerji","Elektrik","Dalgalar"],"11":["Genel Tarama","Kuvvet ve Hareket","Elektrik ve Manyetizma","Optik"],"12":["Genel Tarama","Kuvvet ve Hareket","Enerji","Dalgalar","Madde ve Doğası"]},
  Kimya:{
    "9":["Genel Tarama","Etkileşim: Kimya Hayattır","Etkileşim: Atomdan Periyodik Tabloya","Çeşitlilik: Etkileşimler","Çeşitlilik: Etkileşimden Maddeye","Sürdürülebilirlik: Nanoparçacıklar ve Ekolojik Sürdürülebilirlik"],
    "10":["Genel Tarama","Etkileşim: Kimyasal Tepkimeler","Etkileşim: Gazlar","Çeşitlilik: Çözeltiler","Sürdürülebilirlik: Yeşil Kimya, Çevresel ve Ekolojik Sürdürülebilirlik"],
    "11":["Genel Tarama","Etkileşim: Enerji","Etkileşim: Kimyasal Tepkimelerde Hız","Çeşitlilik: Denge","Çeşitlilik: Asit ve Baz Çözeltilerinde Denge","Çeşitlilik: Çözünürlük Dengesi","Sürdürülebilirlik: Nanoteknoloji ve Sürdürülebilirlik"],
    "12":["Genel Tarama","Etkileşim: İndirgenme-Yükseltgenme Tepkimeleri","Etkileşim: Elektrokimyasal Hücreler","Çeşitlilik: Organik Kimyaya Giriş","Çeşitlilik: Organik Bileşikler","Sürdürülebilirlik"]
  },
  Biyoloji:{
    "9":["Genel Tarama","Yaşam: Bilim, Bilimin Doğası ve Bilimsel Araştırma","Yaşam: Canlıların Ortak Özellikleri","Yaşam: Sınıflandırma ve Biyoçeşitlilik","Organizasyon: Temel Bileşenler ve Moleküller","Organizasyon: Hücrenin Organizasyonu","Organizasyon: Hücre Zarından Madde Geçişleri","Organizasyon: Canlıların Sınıflandırılması ve Biyoçeşitlilik"],
    "10":["Genel Tarama","Enerji: Güneşten Besinlere","Enerji: Fotosentez ve Kemosentez","Enerji: Sindirim, Emilim ve Taşınma","Enerji: Hücresel Solunum ve Fermantasyon","Ekoloji: Ekosistemler","Ekoloji: Popülasyon, Komünite ve Etkileşimler","Ekoloji: Madde ve Enerji Akışı","Ekoloji: Ekolojik Sürdürülebilirlik ve Atık Yönetimi"],
    "11":["Genel Tarama","Tepki: Canlılık ve Tepki","Tepki: Bitkilerde Hormonlar ve Tepki Mekanizmaları","Tepki: Hayvanlarda Sinir Sistemi ve Duyu Organları","Tepki: Destek ve Hareket Sistemi","Tepki: Bağışıklık ve Alerjik Tepkiler","Homeostazi: Canlılar İçin Önemi ve Geri Bildirim","Homeostazi: Sinir ve Endokrin Sistem","Homeostazi: Dolaşım, Solunum ve Boşaltım Sistemleri","Homeostazi: Sağlık Problemleri"],
    "12":["Genel Tarama","Üreme: Hücre Bölünmeleri ve Üreme","Üreme: Eşeysiz ve Eşeyli Üreme","Üreme: İnsanda Üreme ve Gelişme","Üreme: Bitkilerde Eşeyli Üreme ve Gelişme","Gen: Nükleik Asitler ve Gen İfadesi","Gen: Kalıtım","Gen: Eşeye Bağlı Kalıtım ve Soyağacı Analizi","Gen: Biyoteknoloji ve Etik"]
  },
  Coğrafya:{"9":[...geographyUnits],"10":[...geographyUnits],"11":[...geographyUnits],"12":[...geographyUnits]},
  Tarih:{"9":["Genel Tarama","Geçmişin İnşa Sürecinde Tarih","Eski Çağ Medeniyetleri","Orta Çağ Medeniyetleri"],"10":["Genel Tarama","Türkistan’dan Türkiye’ye (1040-1299)","Beylikten Devlete Osmanlı (1299-1453)","Cihan Devleti Osmanlı (1453-1683)"],"11":["Genel Tarama","Değişen Dünyada Osmanlı Devleti (1683-1789)","Dönüşüm Sürecinde Osmanlı (1789-1908)","Savaşlar Sarmalında Osmanlı (1908-1918)"]},
  "T.C. İnkılap Tarihi ve Atatürkçülük":{"12":["Genel Tarama","Modern Türk Devletinin Doğuşu","Türk İnkılabı ve Atatürkçülük","II. Dünya Savaşı’ndan Küreselleşme Sürecine Türkiye"]},
  "Türk Dili ve Edebiyatı":{"9":["Genel Tarama","Sözün İnceliği","Anlam Arayışı","Anlamın Yapı Taşları","Dilin Zenginliği"],"10":["Genel Tarama","Edebî Metinleri Anlama","Şiir","Hikâye ve Roman","Tiyatro","Öğretici Metinler"],"11":["Genel Tarama","Şiir","Öykü ve Roman","Tiyatro","Makale ve Deneme","Edebiyat Dönemleri"],"12":["Genel Tarama","Cumhuriyet Dönemi Şiiri","Roman ve Hikâye","Tiyatro","Deneme ve Söyleşi","Dünya Edebiyatı"]},
  Felsefe:{"10":["Genel Tarama","Felsefenin Doğası","Felsefe, Mantık ve Argümantasyon","Varlık Felsefesi","Bilgi Felsefesi","Ahlak Felsefesi","Estetik ve Sanat Felsefesi","Siyaset Felsefesi","Din Felsefesi","Bilim Felsefesi"],"11":["Genel Tarama","Felsefi Düşüncenin Tarihsel Gelişimi","Bilgi ve Varlık","Ahlak, Siyaset ve Din","Bilim ve Sanat"]},
  İngilizce:{"2":englishSkills,"3":englishSkills,"4":englishSkills,"5":englishSkills,"6":englishSkills,"7":englishSkills,"8":englishSkills,"9":englishSkills,"10":englishSkills,"11":englishSkills,"12":englishSkills},
  Kürtçe:Object.fromEntries(gradeLevels.map(g=>[g,kurdishSkills])),
  Arapça:Object.fromEntries(gradeLevels.map(g=>[g,arabicSkills]))
};

export function getSubjectsForGrade(grade:string,_allowedSubjects?:readonly string[]){return Object.entries(curriculum).filter(([,byGrade])=>Boolean(byGrade[grade])).map(([subject])=>subject)}
export function getTopicsForGrade(subject:string,grade:string){return curriculum[subject]?.[grade]??["Genel Tarama"]}
