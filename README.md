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
- ⏰ **Tek Kaynaklı Otomatik Senkronizasyon:** Aylık TÜFE ve sepet fiyatları tek veri deposundan (`kktc_tufe`) her gün çekilir; doğrulanır, test edilir ve otomatik yayına alınır.
- 💵 **Asgari Ücret Serisi (1977-günümüz):** 79 ücret kararının tam tarihçesi ve **reel (enflasyondan arındırılmış)** değerleri. Reel rakamlar saklanmaz, API'nin kendi TÜFE serisinden hesaplanır; 2005 YTL geçişi motor tarafından ele alınır.
- 📈 **Herkese Açık Kullanım Sayacı:** `/api/v1/stats` ile toplam çağrı sayısı, uç nokta bazında dağılım ve günlük istek serisi. Edge'de Durable Object üzerinde kalıcı tutulur.
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
| `GET` | `/api/v1/wage/latest` | Yürürlükteki brüt asgari ücret, bir önceki karara göre nominal ve reel değişim |
| `GET` | `/api/v1/wage` | Asgari ücret tarihçesi (`granularity=changes\|monthly`, `start_period`, `end_period`, `sort`, `limit`, `offset`) |
| `GET` | `/api/v1/wage/real` | Reel asgari ücret serisi; `base=YYYY-MM` ile istenen dönemin parasına çevrilir |
| `POST`| `/api/v1/sync` | Resmi kaynaktan anlık senkronizasyon tetikleme (*API Key korumalı*) |
| `GET` | `/docs` | İnteraktif Swagger UI dokümantasyon sayfası |
| `GET` | `/api/v1/stats` | API kullanım sayacı: toplam çağrı, uç nokta dağılımı, günlük seri |
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

## 📈 Kullanım Sayacı

`GET /api/v1/stats` API'nin ne kadar kullanıldığını herkese açık olarak gösterir:

```bash
curl -s "https://kktc-tufe-api.stevevaius.workers.dev/api/v1/stats?days=7"
```

```json
{
  "success": true,
  "data": {
    "totalRequests": 20,
    "countingSince": "2026-09-04T11:43:26.016Z",
    "endpoints": [
      { "path": "/api/v1/latest", "count": 8 },
      { "path": "/api/v1/tufe/:year", "count": 5 }
    ],
    "dailyRequests": [{ "day": "2026-09-04", "count": 20 }]
  }
}
```

**Nasıl çalışır?** Edge sürümünde sayım, SQLite destekli tek bir **Durable Object** örneğinde tutulur. Her istek `waitUntil()` içinde, yanıt gönderildikten sonra yazılır; bu yüzden sayaç API gecikmesine eklenmez ve bir hata alsa bile isteği etkilemez.

Uç noktalar ham URL yerine **rota kalıbıyla** kaydedilir (`/api/v1/items/ekmek` yerine `/api/v1/items/:item`), aksi halde 520 sepet kalemi 520 ayrı anahtar üretirdi.

> Node.js/Docker ile kendi sunucunuzda çalıştırdığınızda sayaç süreç belleğinde tutulur ve yeniden başlatmada sıfırlanır; bu durum yanıttaki `countingSince` alanından görülebilir.


---

## 🛠️ Ortam Değişkenleri (.env)

| Değişken | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP dinleme portu |
| `HOST` | `0.0.0.0` | Bağlanılacak ağ arayüzü |
| `API_KEY` | *(yok)* | `POST /api/v1/sync` için yetkilendirme anahtarı. Tanımlanmazsa uç nokta kapalı kalır (503). |
| `RATE_LIMIT_MAX`| `120` | Dakika başına izin verilen maksimum istek sayısı |
| `CRON_SCHEDULE` | `0 20 * * *` | Kaynak deponun kontrol edilme zamanı (Her gün 20:00 UTC) |
| `GITHUB_TUFE_JSON_URL` | `.../kktc_tufe/main/docs/data/tufe.json` | Aylık TÜFE serisi kaynağı (birincil) |
| `GITHUB_ITEMS_CSV_URL` | `.../kktc_tufe/main/GRETL_TUFE.csv` | Sepet madde fiyatları CSV kaynağı |
| `RSS_URL` | `istatistik.gov.ct.tr/.../rss` | Yedek kaynak: veri deposu erişilemezse doğrudan tarama |

---

## 🔄 Veri Güncelleme Akışı

Tüm veriler tek bir kaynaktan gelir: [**`RYucel/kktc_tufe`**](https://github.com/RYucel/kktc_tufe) veri deposu. Bu API o deponun çıktısını tüketir, resmî siteyi kendisi taramaz.

| Hat | Nasıl üretilir | API nasıl alır |
| :--- | :--- | :--- |
| **Aylık TÜFE** (1977→, 594 kayıt) | `kktc_tufe`, **ayın ilk 10 günü 14:00 UTC'de** resmî KKTC İstatistik Kurumu sitesini tarar (RSS → haber sayfası → `TUFE_ARSIV_*.xls`) ve `docs/data/tufe.json` olarak yayınlar | Her gün 20:00 UTC'de o JSON'u çeker |
| **Sepet Madde Fiyatları** (520 kalem × 139 ay) | `GRETL_TUFE.csv` aynı depoya **elle yüklenir** | Her gün o CSV'yi çeker |

```
              istatistik.gov.ct.tr (resmî kaynak)
                          │
                          ↓  kktc_tufe tarar (ayın ilk 10 günü, 14:00 UTC)
              ┌───────────────────────────┐
              │   kktc_tufe veri deposu   │
              │  docs/data/tufe.json      │ ← otomatik
              │  GRETL_TUFE.csv           │ ← elle yüklenir
              └───────────────────────────┘
                          │
                          ↓  bu API her gün 20:00 UTC'de çeker + doğrular
              GitHub Actions → testler → commit → Cloudflare deploy
```

> **Zamanlama neden böyle?** Kurum, yasa gereği ayın ilk haftasında, pratikte mesai bitimine yakın (~15:30 KKTC) yayınlıyor. Kontrolün daima yayından *sonra* düşmesi gerekiyor: 4 Ağustos 2026'da bülten 11:31 UTC'de çıktı, o günkü kontrol 11:23 UTC'de çalıştı ve veri ancak ertesi gün alındı.
>
> GitHub zamanlanmış işleri 0,6-5,0 saat geciktiriyor (16 çalışma üzerinde ölçüldü). Bu yüzden nominal saatler bu payı kaldıracak kadar geç seçildi:
>
> | | Nominal | Gerçek çalışma (yaz / kış, KKTC) |
> | :--- | :--- | :--- |
> | `kktc_tufe` tarama | 14:00 UTC | 17:36-22:00 / 16:36-21:00 |
> | Bu API'nin senkronizasyonu | 20:00 UTC | 23:36-04:00 / 22:36-03:00 |
>
> İkisi de yayın saatinin güvenle sonrasında kalıyor. Zincirdeki bu bekleme süresini tamamen ortadan kaldırmak için aşağıdaki anında tetikleme kurulabilir.

**Neden tek kaynak?** Daha önce hem dashboard hem API resmî siteyi ayrı ayrı tarıyordu. Kurum sayfa yapısını değiştirdiğinde iki yerin de düzeltilmesi gerekiyordu ve biri düzelmezse ikisi farklı rakam gösterebilirdi. Artık ayrıştırma mantığı tek yerde yaşar.

### Asgari ücreti güncellemek (elle, yılda 2 kez)

Asgari ücret yılda iki kez belirlenir ve kazınacak bir kaynağı yoktur; tek elle bakım yapılan veri budur. Yeni ücret açıklandığında [`data/wage.json`](data/wage.json) dosyasındaki `changes` dizisinin **sonuna tek satır** eklemeniz yeterlidir:

```json
{ "effectiveFrom": "2027-01", "amount": 80000 }
```

- `effectiveFrom` — ücretin geçerli olduğu **ilk ay** (`YYYY-MM`)
- `amount` — açıklandığı günün para biriminde **brüt** tutar

Bu dosyayı düzenleyip `main` dalına push ettiğinizde CI kendiliğinden çalışır: kılavuz sayfası yeniden üretilir, testler koşar ve Cloudflare'e yayınlanır.

**Neden reel ücret bu dosyada tutulmuyor?** Çünkü zaten elimizde. Enflasyondan arındırılmış değerler API'nin kendi TÜFE serisinden her istekte hesaplanır. Aynı endeksi ikinci kez saklasaydık, TÜFE her güncellendiğinde iki kopya birbirinden sapabilirdi.

**Doğrulama:** Dosya bozuksa (dönemler sırasız veya tekrarlı, tutar negatif, biçim hatalı) motor **açılışta hata verir**, yanlış rakam yayınlamaz. Bu, elle girilen veri için tek savunmadır ve testlerle sabitlenmiştir.

**2005 YTL geçişi:** 1 Ocak 2005'te 1 TL = 1.000.000 eski TL oldu. Motor bu dönüşümü bilir, bu yüzden 1977 ile bugünün ücreti doğrudan karşılaştırılabilir. 2005 öncesi kayıtlar `TRL`, sonrası `TRY` olarak etiketlenir.

### Sepet verisini güncellemek

Güncel `GRETL_TUFE.csv` dosyasını `kktc_tufe` deposunun `main` dalına yükleyin; gerisi otomatiktir.

**Yanlışlıkla bu depoya yükleme koruması:** `GRETL_TUFE.csv` kaynak depo yerine bu depoya yüklenirse, senkronizasyon üzerine yazmak yerine **açık bir hatayla durur** ve doğru depoyu gösterir. Eskiden bu durum sessizce geri alınıyordu.

**Doğrulama kalkanı:** Her iki veri hattı da diske yazılmadan önce kontrol edilir. Kayıt/kalem sayısı düşerse, zaman serisi kısalırsa veya gelen veri mevcut olandan eskiyse **güncelleme reddedilir ve yayındaki veri korunur** ([`tufeSource.js`](src/engine/tufeSource.js), [`syncItemsService.js`](src/engine/syncItemsService.js)). Hatalı bir yükleme canlı API'yi bozamaz.

**Yedek yol:** Veri deposuna ulaşılamazsa API resmî siteyi doğrudan tarayan yedek yola düşer ([`scraper.js`](src/engine/scraper.js)). Aynı resmî kaynaktan beslendiği için sapma üretmez, yalnızca kesinti anında verinin bayatlamasını önler. Hangi yolun kullanıldığı `/api/v1/meta` yanıtındaki `dataSource` alanında görünür.

### Anında tetikleme (kurulu)

Kaynak depoda veri değiştiği anda bu API tetiklenir; günlük cron beklenmez. Zincirdeki gecikme 2-8 saatten **~1 dakikaya** iner.

`kktc_tufe` deposundaki [`trigger-api-sync.yml`](https://github.com/RYucel/kktc_tufe/blob/main/.github/workflows/trigger-api-sync.yml) workflow'u, `GRETL_TUFE.csv` veya `docs/data/tufe.json` değiştiğinde bu depoya `repository_dispatch` gönderir. Referans kopyası: [`docs/trigger-api-sync.yml`](docs/trigger-api-sync.yml).

Tetikleyici çalışmazsa veri kaybı olmaz: günlük 20:00 UTC cron'u yedek olarak devrededir.

---

## 🔒 Güvenlik Notları

**Hız sınırlaması (edge).** Cloudflare Workers sürümünde uygulama içi hız sınırı **yoktur** ve bilerek eklenmemiştir. Worker isolate'i içinde tutulan bir sayaç işe yaramaz: Cloudflare aynı IP'den gelen sıralı istekleri bile birçok isolate'e dağıtır. Ölçüldü, aynı IP'den 280 sıralı istek (24 saniye) hiç engellenmedi. Böyle bir sayaç yalnızca uygulanmayan bir sınırı ilan eder ve yanlış güven verir.

Gerçek koruma için Cloudflare panosundan bir **Rate Limiting kuralı** tanımlayın (ücretsiz plan bir kural içerir). Kural edge'de, uygulamaya hiç ulaşmadan çalışır ve gecikme eklemez:

> Security → WAF → Rate limiting rules → Create rule
> Eşleşme: `URI Path starts with /api/`
> Sınır: 10 saniyede 100 istek, aynı IP
> Eylem: Block, 10 saniye

**Kendi sunucunuzda (Node/Docker)** hız sınırı uygulama içinde çalışır (`express-rate-limit`, varsayılan dakikada 120 istek, `RATE_LIMIT_MAX` ile değiştirilir).

**`POST /api/v1/sync` uç noktası** yalnızca Node sürümünde vardır ve `API_KEY` ortam değişkeni tanımlıysa açılır. Tanımlı değilse 503 döner. Yayınlanmış bir varsayılan anahtar yoktur; kendi değerinizi üretin (`openssl rand -hex 32`). Anahtar karşılaştırması sabit zamanlıdır.

**Kullanım sayacı** yalnızca sunucu tarafında tanımlı rota kalıplarını saklar. Eşleşmeyen istekler tek bir `__unmatched__` kovasında toplanır; aksi halde istemci, kalıcı kayıt üreterek Durable Object kotasını tüketebilirdi.


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
