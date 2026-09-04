# TUFE_API - Proje Yönetim ve Otonom Geliştirme Kuralları (Manager & Implementer Loop)

Bu belgedeki kurallar, uzun soluklu ve karmaşık görevlerde modelin odağını kaybetmesini, ayrıntılarda boğulmasını ("asymptote" / ilerlemenin tıkanması) önlemek ve tam otonom, aşamalı bir yürütme sağlamak için uygulanır.

---

## 1. Mimari: İki Kademeli Ajan Döngüsü (Manager - Implementer)

1. **Manager (Yönetici Ajan):**
   - Kullanıcı hedefini analiz eder.
   - İşi uçtan uca kapsayan detaylı ve devasa bir yapılacaklar listesi (Checklist) çıkarır.
   - Bu listeyi mantıksal ve sıralı **Aşamalara (Phases: Faz 1, Faz 2, Faz 3...)** böler.
   - `/goal` modunda çalışır; büyük resmi yönetir ve fazları sırayla yürütür.

2. **Implementer (Uygulayıcı Ajan / Subagent):**
   - Manager tarafından ayrı bir iş parçacığında/alt ajanda (subagent) başlatılır.
   - Tek seferde yalnızca **tek bir aşamaya** odaklanır.
   - İlgili aşama bitene kadar durmaksızın çalışır, bitirdiğinde Manager'a durumu raporlar.

---

## 2. Aşamalı ve Otonom Çalışma Protokolü

1. **Aşama Aşama İlerleme (Piecemeal Execution):**
   - Implementer ajana aynı anda tüm proje verilmez; yalnızca içinde bulunulan tek bir faz atanır.
   - Manager komutu: `/goal [Faz Adı] aşamasını eksiksiz ve son derece iyi (extremely well) şekilde tamamla.`
   - Bir faz bitmeden ve doğrulanmadan sonraki faza kesinlikle geçilmez.

2. **Kritik İfade Kuralı: "Extremely Well" vs. "Perfect":**
   - Görev tanımlarında **"kusursuz / mükemmel (perfect)"** yerine her zaman **"son derece iyi / üstün kalitede (extremely well)"** ifadesi kullanılır.
   - *Gerekçe:* "Mükemmel" direktifi modeli gereksiz mikro-detaylara, sonsuz refactor döngülerine ve analitik felce iter. "Son derece iyi" ifadesi ise yüksek kalite standardını korurken faza ait "Bitti Tanımı" (Definition of Done) karşılandığında ilerlemeyi sağlar.

---

## 3. İlerleme Takip Ekranı (Canlı HTML Checklist & Dashboard)

1. **`progress.html` Panosu:**
   - Projenin kök dizininde veya belirlenen çalışma alanında tüm yapılacaklar listesini içeren modern, temiz bir `progress.html` oluşturulur.
   - **Özellikler:**
     - Fazlara göre gruplanmış görevler ve onay kutuları (checkbox).
     - Tamamlanan / toplam görev sayacı ve yüzde göstergesi.
     - Zaman içindeki ilerleme hızını gösteren dinamik bir grafik/zaman çizelgesi.
2. **Anlık Güncelleme:**
   - Implementer tamamladığı her adımdan sonra bu dosyayı günceller, kutuları işaretler ve sayacı artırır.
   - Hem insan hem de üst kademe ajanlar projenin mevcut durumunu anlık olarak doğrular.

---

## 4. Carmack & Closed-Loop Doğrulama İlkesi

- Her faz tamamlandığında Implementer kendi doğrulamalarını (testler, yerel API çağrıları, log kontrolleri) kapalı devre sistemde kendi yapar.
- Başarılı doğrulama sonrası Manager'a net bir özet döner:
  - *Neler yapıldı?*
  - *Hangi testler/kontroller geçti?*
  - *Sıradaki faza geçiş onayı.*
