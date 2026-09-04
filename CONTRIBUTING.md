# KKTC TÜFE API - Katkı Sağlama Rehberi

Bu proje, KKTC Tüketici Fiyat Endeksi verilerini geliştiricilere ücretsiz, açık kaynaklı ve güvenilir bir RESTful API olarak sunmayı amaçlayan bir topluluk projesidir. Katkılarınız için teşekkür ederiz!

---

## Nasıl Katkıda Bulunabilirsiniz?

1. **Hata Bildirimi:** Karşılaştığınız hataları veya eksik/hatalı hesaplamaları lütfen detaylı veriler ve adımlarla birlikte GitHub Issues üzerinden bildirin.
2. **Yeni Özellik & İyileştirme:**
   - Depoyu fork edin (`Fork`).
   - Yeni bir özellik dalı açın (`git checkout -b feature/yeni-ozellik`).
   - Değişikliklerinizi yapın ve testleri çalıştırın (`npm test`).
   - Değişikliklerinizi commit edin (`git commit -m 'feat: Yeni özellik eklendi'`).
   - Dalınıza push yapın (`git push origin feature/yeni-ozellik`).
   - Bir **Pull Request (PR)** oluşturun.

---

## Geliştirme Ortamı Kurulumu

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda başlatın (otomatik yeniden yükleme)
npm run dev

# Verileri resmi KKTC İstatistik Kurumu'ndan manuel tazeleyin
npm run sync

# Testleri çalıştırın
npm test
```

---

## Kod Standartları

- Modern ES Modülleri (`import / export`) kullanılır.
- Kod sade, anlaşılır ve açıklayıcı yorumlarla zenginleştirilmelidir.
- Yeni eklenen hesaplama veya uç noktalar için mutlaka `test/` dizini altına testler eklenmelidir.
