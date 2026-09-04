# KKTC TÜFE (Enflasyon) RESTful API 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Live_on_Edge-F38020?logo=cloudflare&logoColor=white)](https://kktc-tufe-api.stevevaius.workers.dev)
[![Swagger UI](https://img.shields.io/badge/API_Docs-Swagger_UI-85EA2D?logo=swagger&logoColor=black)](https://kktc-tufe-api.stevevaius.workers.dev/docs)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**KKTC Tüketici Fiyat Endeksi (TÜFE / Enflasyon) Açık Kaynak RESTful API Servisi.**

> 🌐 **Canlı Edge API:** [https://kktc-tufe-api.stevevaius.workers.dev](https://kktc-tufe-api.stevevaius.workers.dev)  
> 📖 **İnteraktif Swagger Dokümantasyonu:** [https://kktc-tufe-api.stevevaius.workers.dev/docs](https://kktc-tufe-api.stevevaius.workers.dev/docs)  
> 📊 **En Son Enflasyon Verisi:** [https://kktc-tufe-api.stevevaius.workers.dev/api/v1/latest](https://kktc-tufe-api.stevevaius.workers.dev/api/v1/latest)

Bu proje, resmi **KKTC Başbakanlık İstatistik Kurumu**'nun yayınladığı aylık TÜFE bülten ve arşivlerini (1977'den günümüze) otomatik olarak takip eden, ayrıştıran ve geliştiricilere yüksek performanslı, modern ve tam dokümantasyonlu bir açık kaynak REST API olarak sunan bağımsız bir servistir.

---

## 🌟 Öne Çıkan Özellikler

- 📊 **1977'den Günümüze Tam Seri:** 590+'dan fazla aylık kayıt, yıllık değişim ve yılbaşından bu yana (YTD) resmi veriler.
- 🏛️ **KKTC Hayat Pahalılığı Dönem Kümülatifleri:** KKTC kamu maaşları, emekli maaşları ve asgari ücret artışlarında yasal olarak uygulanan **1. Dönem (Ocak–Haziran)** ve **2. Dönem (Temmuz–Aralık)** kümülatif değişim hesaplamaları.
- 🧮 **Bileşik Enflasyon & Alım Gücü Hesaplayıcı:** İki tarih arasındaki toplam bileşik enflasyon çarpanını ve paranın (örn. 10.000 TL) hedef tarihteki reel değerini anında hesaplar.
- ⚡ **Mikrosaniye Yanıt Süresi:** Akıllı in-memory indeksleme sayesinde harici veritabanı gerektirmeden ultra hızlı yanıtlar.
- 📖 **İnteraktif OpenAPI / Swagger UI:** Tüm parametreleri tarayıcı üzerinden doğrudan deneyebilme (`/docs`).
- ⏰ **Çift Hatlı Otomatik Senkronizasyon:** Resmi TÜFE bültenini ve sepet madde fiyatları CSV'sini her gün kontrol eden yerleşik Cron servisi + GitHub Actions boru hattı.
- 🐳 **Docker & Docker-Compose:** Tek komutla prodüksiyon ortamında ayağa kaldırılmaya hazır.

---

## 📚 API Uç Noktaları (Endpoints)

| Metot | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/health` | Servis sağlık kontrolü, uptime ve önbellek durumu |
| `GET` | `/api/v1/meta` | Kaynak bülten linki, son kontrol/değişim tarihleri ve kayıt sayısı |
| `GET` | `/api/v1/latest` | En son açıklanan resmi ayın enflasyon verisi |
| `GET` | `/api/v1/tufe` | Filtreli zaman serisi (`year`, `start_year`, `end_year`, `month`, `sort`, `limit`, `offset`) |
| `GET` | `/api/v1/tufe/:year` | Belirtilen yılın 12 aylık dökümü, ortalaması ve dönem özetleri |
| `GET` | `/api/v1/tufe/:year/:month` | Belirli bir yıl ve aya ait detaylı oranlar |
| `GET` | `/api/v1/periods` | KKTC 6 aylık hayat pahalılığı / maaş endeksleme kümülatifleri |
| `GET` | `/api/v1/calculate` | İki tarih arası bileşik enflasyon ve para değerleme aracı |
| `POST`| `/api/v1/sync` | Resmi kaynaktan anlık senkronizasyon tetikleme (*API Key korumalı*) |
| `GET` | `/docs` | İnteraktif Swagger UI dokümantasyon sayfası |
| `GET` | `/api/openapi.json` | Standart OpenAPI 3.0.3 JSON şeması |

---

## 🚀 Hızlı Başlangıç

### 1. Yerel Kurulum (Node.js)

Gereksinim: **Node.js 20+**

```bash
# Depoyu klonlayın
git clone https://github.com/RYucel/kktc_tufe_api.git
cd kktc_tufe_api

# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start
# veya geliştirme modunda (hot-reload):
npm run dev
```

Sunucu varsayılan olarak `http://localhost:3000` üzerinde çalışır.
* **Geliştirici Paneli:** [http://localhost:3000/](http://localhost:3000/)
* **Swagger Dokümantasyonu:** [http://localhost:3000/docs](http://localhost:3000/docs)

---

### 2. Cloudflare Edge Üzerinde Yayına Alma (Canlı & Ücretsiz) ⚡

Proje, Cloudflare Workers üzerinde 300+ küresel edge noktasında sıfır maliyetle çalışacak şekilde hazırlanmıştır:

```bash
# Cloudflare hesabınızla oturum açın
npx wrangler login

# Tek komutla tüm dünyaya yayınlayın
npm run deploy
```

Yayınlandığında API'niz anında `https://kktc-tufe-api.<hesabiniz>.workers.dev` adresinde canlıya geçer! Detaylar için [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md) dosyasına göz atabilirsiniz.

---

### 3. Docker ile Çalıştırma

```bash
# Docker Compose ile tek komutta başlatın:
docker compose up -d
```

---

## 🛠️ Ortam Değişkenleri (.env)

| Değişken | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP dinleme portu |
| `HOST` | `0.0.0.0` | Bağlanılacak ağ arayüzü |
| `API_KEY` | `kktc_tufe_secret_key_2026` | `POST /api/v1/sync` için yetkilendirme anahtarı |
| `RATE_LIMIT_MAX`| `120` | Dakika başına izin verilen maksimum istek sayısı |
| `CRON_SCHEDULE` | `0 9 * * *` | Otomatik senkronizasyon zamanı (Her gün 09:00 UTC) |
| `GITHUB_ITEMS_CSV_URL` | `.../RYucel/kktc_tufe/main/GRETL_TUFE.csv` | Sepet madde fiyatları CSV kaynağı |

---

## 🔄 Veri Güncelleme Akışı

Projede **iki bağımsız veri hattı** vardır ve ikisi de otomatiktir:

| Hat | Kaynak | Güncelleme şekli |
| :--- | :--- | :--- |
| **Genel TÜFE** (1977→, 593 kayıt) | KKTC İstatistik Kurumu RSS → haber sayfası → `TUFE_ARSIV_*.xls` | Tamamen otomatik: bülten yayınlanınca ilk kontrolde yakalanır |
| **Sepet Madde Fiyatları** (520 kalem × 139 ay) | [`RYucel/kktc_tufe`](https://github.com/RYucel/kktc_tufe) deposundaki `GRETL_TUFE.csv` | Elle yüklenir; API yüklemeyi otomatik algılar |

### Sepet verisini güncellemek

Tek yapmanız gereken, güncel `GRETL_TUFE.csv` dosyasını `RYucel/kktc_tufe` deposunun `main` dalına yüklemektir. Gerisi otomatiktir:

```
GRETL_TUFE.csv yüklenir (kktc_tufe deposu)
        ↓  (repository_dispatch — anında)  |  (günlük cron — en geç 09:00 UTC)
GitHub Actions: npm run sync
        ↓
CSV doğrulanır → data/items_data.json + items_meta.json yeniden derlenir
        ↓
Değişiklik commit'lenir → Cloudflare Workers'a otomatik deploy
```

**Doğrulama kalkanı:** İndirilen CSV diske yazılmadan önce hafızada ayrıştırılıp kontrol edilir. Kalem sayısı %10'dan fazla düşerse, zaman serisi kısalırsa veya dosya mevcut veriden eskiyse **güncelleme reddedilir ve yayındaki veri korunur** ([`syncItemsService.js`](src/engine/syncItemsService.js)). Böylece hatalı bir yükleme canlı API'yi bozamaz.

### Anında tetikleme (opsiyonel)

Varsayılan olarak sistem günlük cron ile çalışır; yeni CSV en geç ertesi sabah yayına girer. Gecikmeyi ~1 dakikaya indirmek için [`docs/trigger-api-sync.yml`](docs/trigger-api-sync.yml) dosyasını `kktc_tufe` deposuna kopyalayın — kurulum adımları dosyanın başındaki yorumda anlatılmıştır.

---

## 💡 Kullanım Örnekleri

### cURL

```bash
# En son enflasyon verisini al
curl -s http://localhost:3000/api/v1/latest

# 2024 yılı Ocak-Haziran (1. Dönem) kümülatifini al
curl -s "http://localhost:3000/api/v1/periods?year=2024"

# 2023 başındaki 10.000 TL'nin 2024 sonundaki enflasyon karşılığını hesapla
curl -s "http://localhost:3000/api/v1/calculate?start_year=2023&start_month=1&end_year=2024&end_month=12&amount=10000"
```

### JavaScript / Node.js

```javascript
const res = await fetch("http://localhost:3000/api/v1/latest");
const { data } = await res.json();
console.log(`${data.monthName} ${data.year} Aylık TÜFE: %${data.aylikYuzde}`);
```

### Python

```python
import urllib.request
import json

with urllib.request.urlopen("http://localhost:3000/api/v1/latest") as resp:
    payload = json.loads(resp.read().decode())
    data = payload["data"]
    print(f"{data['monthName']} {data['year']} Enflasyon: %{data['aylikYuzde']}")
```

---

## 🧪 Testleri Çalıştırma

Sistem kapalı devre (closed-loop) otomatik testler içerir:

```bash
npm test
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak yayınlanmıştır.
Veri kaynağı: [KKTC Başbakanlık İstatistik Kurumu](https://istatistik.gov.ct.tr/).
