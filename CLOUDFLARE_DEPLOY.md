# Cloudflare Workers Üzerinde Dağıtım Rehberi 🚀

KKTC TÜFE API, Cloudflare'in 300'den fazla küresel edge veri merkezinde 0ms soğuk başlama (cold-start) süresi ve 100.000 ücretsiz istek/gün kotası ile çalışacak şekilde optimize edilmiştir.

---

## 1. Yöntem: Terminalden Tek Komutla Canlıya Alma (Önerilen)

Gereksinim: Ücretsiz bir [Cloudflare hesabı](https://dash.cloudflare.com/sign-up).

```bash
# Cloudflare hesabınıza giriş yapın (tarayıcıda tek tıkla onaylanır)
npx wrangler login

# API'yi doğrudan Cloudflare Edge ağına yayınlayın
npm run deploy
```

Yayınlama bittiğinde size anında global bir HTTPS adresi verilir:
```
https://kktc-tufe-api.<kullanici-adiniz>.workers.dev
```

Tarayıcınızda veya cURL ile test edebilirsiniz:
- `https://kktc-tufe-api.<kullanici-adiniz>.workers.dev/`
- `https://kktc-tufe-api.<kullanici-adiniz>.workers.dev/docs` (Swagger UI)
- `https://kktc-tufe-api.<kullanici-adiniz>.workers.dev/api/v1/latest`

---

## 2. Yöntem: GitHub Actions ile Tam Otomatik Dağıtım

Depoyu GitHub'a yükledikten sonra otomatik veri güncelleme ve Cloudflare dağıtımını bağlamak için:

1. **Cloudflare API Token Oluşturun:**
   - [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) sayfasına gidin.
   - **Create Token** butonuna tıklayın ve **"Edit Cloudflare Workers"** şablonunu seçin.
   - Oluşan token'ı kopyalayın.

2. **GitHub Secrets'a Ekleyin:**
   - GitHub deponuzda **Settings → Secrets and variables → Actions** sayfasına gidin.
   - **New repository secret** butonuna tıklayın:
     - Name: `CLOUDFLARE_API_TOKEN`
     - Value: *(Kopyaladığınız token)*

3. **Tamamlandı!**
   - Artık GitHub Actions her ayın ilk 10 günü resmi KKTC İstatistik Kurumu'nu otomatik kontrol eder.
   - Yeni enflasyon verisi çıktığında depoyu günceller ve tek kuruş ödemeden API'nizi Cloudflare Edge üzerinde günceller.

---

## Özel Alan Adı (Custom Domain) Bağlama (Opsiyonel)

Kendi alan adınızı (örneğin `api.enflasyon.kktc` veya `tufe-api.siteniz.com`) bağlamak için:
1. Cloudflare Dashboard'da **Workers & Pages → kktc-tufe-api** projesine tıklayın.
2. **Settings → Domains & Routes → Add Custom Domain** butonuna basın.
3. Kendi alan adınızı yazın. SSL sertifikası ve DDoS koruması Cloudflare tarafından otomatik tanımlanır.
