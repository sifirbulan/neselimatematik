export const gradeLevels=["1","2","3","4","5","6","7","8","9","10","11","12","Mezun / YKS","KPSS / ALES"] as const;

const commonHighSchoolGeography=["Genel Tarama","Coğrafyanın Doğası","Mekânsal Bilgi Teknolojileri","Doğal Sistemler ve Süreçler","Beşerî Sistemler ve Süreçler","Ekonomik Faaliyetler ve Etkileri","Afetler ve Sürdürülebilir Çevre","Bölgeler, Ülkeler ve Küresel Bağlantılar"];

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
    "3":["Genel Tarama","Dinleme/İzleme","Okuma","Konuşma","Yazma","Söz Varlığı","Metni Anlama"],
    "4":["Genel Tarama","Dinleme/İzleme","Okuma","Konuşma","Yazma","Söz Varlığı","Metni Anlama"],
    "5":["Genel Tarama","Oyun Dünyası","Atatürk’ü Tanımak","Duygularımı Tanıyorum","Geleneklerimiz","İletişim ve Sosyal İlişkiler","Sağlıklı Yaşıyorum"],
    "6":["Genel Tarama","Dilimizin Zenginliği","Bağımsızlık Yolu","Farklı Dünyalar","İletişim ve Sosyal İlişkiler","Bilim ve Teknoloji","Lider Ruhlar"],
    "7":["Genel Tarama","Okuma","Dinleme/İzleme","Konuşma","Yazma","Metin Çözümleme","Söz Varlığı"],
    "8":["Genel Tarama","Okuma","Dinleme/İzleme","Konuşma","Yazma","Metin Çözümleme","Söz Varlığı"]
  },
  "Fen Bilimleri":{
    "3":["Genel Tarama","Dünya ve Evren","Canlılar ve Yaşam","Fiziksel Olaylar","Madde ve Doğası","Sürdürülebilir Yaşam"],
    "4":["Genel Tarama","Dünya ve Evren","Canlılar ve Yaşam","Fiziksel Olaylar","Madde ve Doğası","Sürdürülebilir Yaşam"],
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
  Fizik:{
    "9":["Genel Tarama","Fizik Bilimi ve Kariyer Keşfi","Kuvvet ve Hareket","Akışkanlar","Enerji"],
    "10":["Genel Tarama","Kuvvet ve Hareket","Enerji","Elektrik","Dalgalar"],
    "11":["Genel Tarama","Kuvvet ve Hareket","Elektrik ve Manyetizma","Dalgalar ve Optik","Modern Fizik"],
    "12":["Genel Tarama","Çembersel Hareket","Basit Harmonik Hareket","Dalga Mekaniği","Atom Fiziği","Modern Fizik"]
  },
  Kimya:{
    "9":["Genel Tarama","Etkileşim","Çeşitlilik","Sürdürülebilirlik"],
    "10":["Genel Tarama","Etkileşim","Çeşitlilik","Sürdürülebilirlik"],
    "11":["Genel Tarama","Etkileşim","Çeşitlilik","Sürdürülebilirlik"],
    "12":["Genel Tarama","Etkileşim","Çeşitlilik","Sürdürülebilirlik"]
  },
  Biyoloji:{
    "9":["Genel Tarama","Yaşam","Organizasyon"],
    "10":["Genel Tarama","Enerji","Ekoloji"],
    "11":["Genel Tarama","Tepki","Homeostazi"],
    "12":["Genel Tarama","Üreme","Gen"]
  },
  Coğrafya:{"9":commonHighSchoolGeography,"10":commonHighSchoolGeography,"11":commonHighSchoolGeography,"12":commonHighSchoolGeography},
  Tarih:{
    "9":["Genel Tarama","Geçmişin İnşa Sürecinde Tarih","Eski Çağ Medeniyetleri","Orta Çağ Medeniyetleri"],
    "10":["Genel Tarama","Türkistan’dan Türkiye’ye (1040-1299)","Beylikten Devlete Osmanlı (1299-1453)","Cihan Devleti Osmanlı (1453-1683)"],
    "11":["Genel Tarama","Değişen Dünyada Osmanlı Devleti (1683-1789)","Dönüşüm Sürecinde Osmanlı (1789-1908)","Savaşlar Sarmalında Osmanlı (1908-1918)"]
  },
  "Türk Dili ve Edebiyatı":{
    "9":["Genel Tarama","Sözün İnceliği","Anlam Arayışı","Anlamın Yapı Taşları","Dilin Zenginliği"],
    "10":["Genel Tarama","Edebî Metinleri Anlama","Şiir","Hikâye ve Roman","Tiyatro","Öğretici Metinler"],
    "11":["Genel Tarama","Şiir","Öykü ve Roman","Tiyatro","Makale ve Deneme","Edebiyat Dönemleri"],
    "12":["Genel Tarama","Cumhuriyet Dönemi Şiiri","Roman ve Hikâye","Tiyatro","Deneme ve Söyleşi","Dünya Edebiyatı"]
  },
  Felsefe:{
    "10":["Genel Tarama","Felsefenin Doğası","Felsefe, Mantık ve Argümantasyon","Varlık Felsefesi","Bilgi Felsefesi","Ahlak Felsefesi","Estetik ve Sanat Felsefesi","Siyaset Felsefesi","Din Felsefesi","Bilim Felsefesi"],
    "11":["Genel Tarama","Felsefi Düşüncenin Tarihsel Gelişimi","Bilgi ve Varlık","Ahlak, Siyaset ve Din","Bilim ve Sanat"]
  },
  İngilizce:{
    "1":["Genel Tarama","Listening and Speaking","Basic Vocabulary","Simple Classroom Language"],"2":["Genel Tarama","Listening and Speaking","Basic Vocabulary","Simple Sentences"],"3":["Genel Tarama","Listening","Speaking","Reading","Vocabulary"],"4":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary"],
    "5":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary"],"6":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary"],"7":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary"],"8":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary"],
    "9":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary and Grammar"],"10":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary and Grammar"],"11":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary and Grammar"],"12":["Genel Tarama","Listening","Speaking","Reading","Writing","Vocabulary and Grammar"]
  },
  Kürtçe:{
    "1":["Genel Tarama","Dinleme ve Konuşma","Temel Kelimeler"],"2":["Genel Tarama","Dinleme ve Konuşma","Temel Kelimeler","Basit Cümleler"],"3":["Genel Tarama","Dinleme","Konuşma","Okuma","Kelime Bilgisi"],"4":["Genel Tarama","Dinleme","Konuşma","Okuma","Yazma","Kelime Bilgisi"],
    "5":["Genel Tarama","Dinleme","Konuşma","Okuma","Yazma","Dil Bilgisi"],"6":["Genel Tarama","Dinleme","Konuşma","Okuma","Yazma","Dil Bilgisi"],"7":["Genel Tarama","Dinleme","Konuşma","Okuma","Yazma","Dil Bilgisi"],"8":["Genel Tarama","Dinleme","Konuşma","Okuma","Yazma","Dil Bilgisi"],
    "9":["Genel Tarama","Okuma","Yazma","Dil Bilgisi","Söz Varlığı"],"10":["Genel Tarama","Okuma","Yazma","Dil Bilgisi","Söz Varlığı"],"11":["Genel Tarama","Okuma","Yazma","Dil Bilgisi","Söz Varlığı"],"12":["Genel Tarama","Okuma","Yazma","Dil Bilgisi","Söz Varlığı"]
  }
};

export function getTopicsForGrade(subject:string,grade:string):string[]{
  const byGrade=curriculum[subject];
  if(!byGrade)return ["Genel Tarama"];
  return byGrade[grade]??["Genel Tarama"];
}

export function getSubjectsForGrade(grade:string,allSubjects:string[]):string[]{
  if(grade==="Mezun / YKS"||grade==="KPSS / ALES")return allSubjects.filter(s=>s!=="Otomatik");
  const n=Number(grade);
  if(!Number.isFinite(n))return allSubjects.filter(s=>s!=="Otomatik");
  return allSubjects.filter(subject=>{
    if(subject==="Otomatik")return false;
    if(subject==="Kürtçe"||subject==="İngilizce")return true;
    return Boolean(curriculum[subject]?.[grade]);
  });
}
