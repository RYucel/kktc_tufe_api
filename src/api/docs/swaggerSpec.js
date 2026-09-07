import { API_VERSION } from "../../constants.js";

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "KKTC TÜFE (Enflasyon) RESTful API",
    version: API_VERSION,
    description: `
**KKTC Tüketici Fiyat Endeksi (TÜFE / Enflasyon) Açık Kaynak RESTful API Servisi**

Bu API, resmi **KKTC Başbakanlık İstatistik Kurumu** tarafından yayınlanan 1977'den günümüze tüm aylık TÜFE bülten ve arşivlerini otomatik olarak takip eder ve geliştiricilere yüksek performanslı, JSON formatında açık veri olarak sunar.

### Temel Özellikler:
* **Tarihsel Derinlik:** 1977'den günümüze kesintisiz tüm aylık, yıllık ve yılbaşından bu yana değişim oranları.
* **KKTC Dönem Kümülatifleri:** KKTC kamu maaşları, emekli maaşları ve asgari ücret hayat pahalılığı artışlarında yasal olarak kullanılan **1. Dönem (Ocak-Haziran)** ve **2. Dönem (Temmuz-Aralık)** kümülatifleri.
* **Bileşik Enflasyon Hesaplayıcı:** İki tarih arasındaki bileşik enflasyonu ve para tutarının bugünkü değerini otomatik hesaplar.
* **Sıfır Dış Bağımlılık & Yüksek Hız:** Bellek içi indeksleme sayesinde mikrosaniye seviyesinde yanıt süreleri.
    `,
    contact: {
      name: "KKTC TÜFE Açık Kaynak Topluluğu",
      url: "https://github.com/RYucel/kktc_tufe",
    },
    license: {
      name: "MIT Lisansı",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "/",
      description: "Aktif Sunucu",
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Sistem Sağlık Durumu",
        description: "API servisinin ve veri motorunun durumunu, çalışma süresini ve önbellekteki kayıt sayısını döndürür.",
        tags: ["Sistem"],
        responses: {
          200: {
            description: "Sistem sağlıklı çalışıyor",
            content: {
              "application/json": {
                example: {
                  status: "healthy",
                  platform: "Cloudflare Workers (Edge)",
                  timestamp: "2026-09-04T10:45:00.000Z",
                  dataEngine: {
                    initialized: true,
                    recordCount: 593,
                    latestDataPeriod: "2026-07",
                  },
                  itemsEngine: {
                    initialized: true,
                    totalItems: 520,
                    totalMonths: 139,
                    periodRange: "2015-01 - 2026-07",
                  },
                  version: API_VERSION,
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/meta": {
      get: {
        summary: "Veri Seti Meta Verileri",
        description: "En son kontrol tarihi, resmi kaynak linki, arşiv dosya URL'si ve veri aralığı gibi meta bilgileri sunar.",
        tags: ["Sistem"],
        responses: {
          200: {
            description: "Meta veriler başarıyla getirildi",
            content: {
              "application/json": {
                example: {
                  success: true,
                  meta: {
                    lastChecked: "2026-09-04T10:00:00.000Z",
                    lastChanged: "2026-08-05T11:21:08.184Z",
                    latestHeadline: "Tüketici Fiyat Endeksi - Temmuz 2026",
                    latestPubDate: "Tue, 04 Aug 2026 11:31:00 GMT",
                    archiveUrl: "https://istatistik.gov.ct.tr/Portals/39/TUFE_ARSIV_YUZDE_TEMMUZ_2026_WEB.xls",
                    recordCount: 593,
                    latestAvailablePeriod: "2026-07",
                    officialSource: "KKTC Başbakanlık İstatistik Kurumu",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/latest": {
      get: {
        summary: "En Son Açıklanan Enflasyon Verisi",
        description: "Resmi olarak duyurulmuş en güncel ayın TÜFE oranlarını ve mevcut yılın dönem durumunu getirir.",
        tags: ["TÜFE Verileri"],
        responses: {
          200: {
            description: "En son ay verisi",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    year: 2026,
                    month: 7,
                    monthName: "Temmuz",
                    period: "2026-07",
                    aylikYuzde: 2.9,
                    yilBasindanYuzde: 20.34,
                    yillikYuzde: 38.1,
                    currentYearStatus: {
                      period1: {
                        name: "1. Dönem (Ocak - Haziran)",
                        isComplete: true,
                        cumulativeRate: 16.9494,
                      },
                      period2: {
                        name: "2. Dönem (Temmuz - Aralık)",
                        isComplete: false,
                        availableMonths: 1,
                        cumulativeRate: 2.9,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/tufe": {
      get: {
        summary: "TÜFE Zaman Serisi ve Filtreleme",
        description: "1977'den bugüne tüm enflasyon kayıtlarını filtreleme, sıralama ve sayfalama seçenekleriyle sorgular.",
        tags: ["TÜFE Verileri"],
        parameters: [
          {
            name: "year",
            in: "query",
            description: "Tek bir yıl filtresi (örn: 2024)",
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "month",
            in: "query",
            description: "Tek bir ay filtresi (1-12)",
            schema: { type: "integer", example: 6 },
          },
          {
            name: "start_year",
            in: "query",
            description: "Başlangıç yılı (örn: 2020)",
            schema: { type: "integer", example: 2020 },
          },
          {
            name: "end_year",
            in: "query",
            description: "Bitiş yılı (örn: 2024)",
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "sort",
            in: "query",
            description: "Sıralama yönü (asc veya desc)",
            schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
          },
          {
            name: "limit",
            in: "query",
            description: "Döndürülecek maksimum kayıt adedi",
            schema: { type: "integer", example: 12 },
          },
          {
            name: "offset",
            in: "query",
            description: "Atlanacak kayıt sayısı",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          200: {
            description: "Filtrelenmiş kayıtlar",
          },
        },
      },
    },
    "/api/v1/tufe/{year}": {
      get: {
        summary: "Yıllık TÜFE Dökümü ve İstatistikleri",
        description: "Belirtilen yıla ait 12 ayın dökümünü, ortalama aylık enflasyonu ve 1./2. dönem kümülatiflerini döndürür.",
        tags: ["TÜFE Verileri"],
        parameters: [
          {
            name: "year",
            in: "path",
            required: true,
            description: "İncelenecek yıl",
            schema: { type: "integer", example: 2024 },
          },
        ],
        responses: {
          200: { description: "Yıl detayları ve istatistikleri" },
          404: { description: "Yıla ait veri bulunamadı" },
        },
      },
    },
    "/api/v1/tufe/{year}/{month}": {
      get: {
        summary: "Tekil Ay Detayı",
        description: "Belirtilen yıl ve ayın resmi değişim oranlarını döndürür.",
        tags: ["TÜFE Verileri"],
        parameters: [
          {
            name: "year",
            in: "path",
            required: true,
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "month",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1, maximum: 12, example: 6 },
          },
        ],
        responses: {
          200: { description: "Ay detayı" },
          404: { description: "Kayıt bulunamadı" },
        },
      },
    },
    "/api/v1/periods": {
      get: {
        summary: "KKTC Hayat Pahalılığı ve Maaş Endeksleme Dönemleri",
        description: "KKTC'de kamu maaşları, emekli maaşları ve asgari ücret artışlarında kullanılan 6 aylık resmi kümülatif oranları (1. Dönem: Ocak-Haziran, 2. Dönem: Temmuz-Aralık) hesaplar.",
        tags: ["Hesaplama ve Analiz"],
        parameters: [
          {
            name: "year",
            in: "query",
            description: "Hesaplanacak yıl (boş bırakılırsa en güncel yıl)",
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "all",
            in: "query",
            description: "Tüm yılların dönem verilerini getirmek için 'true' girin",
            schema: { type: "boolean", example: false },
          },
        ],
        responses: {
          200: { description: "Dönem kümülatifleri" },
        },
      },
    },
    "/api/v1/calculate": {
      get: {
        summary: "Bileşik Enflasyon ve Alım Gücü Değerleme Aracı",
        description: "İki tarih arasındaki toplam bileşik enflasyonu hesaplar ve girilen paranın (örn. 10.000 TL) bugünkü/hedef tarihteki enflasyona göre karşılığını bulur.",
        tags: ["Hesaplama ve Analiz"],
        parameters: [
          {
            name: "start_year",
            in: "query",
            required: true,
            schema: { type: "integer", example: 2022 },
          },
          {
            name: "start_month",
            in: "query",
            required: true,
            schema: { type: "integer", example: 1 },
          },
          {
            name: "end_year",
            in: "query",
            description: "Bitiş yılı (varsayılan: en son ayın yılı)",
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "end_month",
            in: "query",
            description: "Bitiş ayı (varsayılan: en son ay)",
            schema: { type: "integer", example: 12 },
          },
          {
            name: "amount",
            in: "query",
            description: "Değerlenecek para tutarı (TL)",
            schema: { type: "number", default: 100, example: 10000 },
          },
        ],
        responses: {
          200: { description: "Hesaplama sonucu" },
          400: { description: "Geçersiz parametreler" },
        },
      },
    },
    "/api/v1/items": {
      get: {
        summary: "Sepet Madde Fiyat Listesi (520 Kalem)",
        description: "KKTC tüketim sepetindeki 520 mal ve hizmet kalemini listeler. Arama (`search`), sayfalama (`limit`, `offset`) destekler. İlk (2015-01) ve son fiyat ile toplam artış oranını özetler.",
        tags: ["Sepet Madde Fiyatları"],
        parameters: [
          {
            name: "search",
            in: "query",
            description: "Ürün adı veya slug ile filtreleme (örn: ekmek, benzin, et, sut)",
            schema: { type: "string", example: "ekmek" },
          },
          {
            name: "limit",
            in: "query",
            description: "Döndürülecek kayıt sayısı (varsayılan: 50)",
            schema: { type: "integer", default: 50, example: 20 },
          },
          {
            name: "offset",
            in: "query",
            description: "Atlanacak kayıt sayısı",
            schema: { type: "integer", default: 0, example: 0 },
          },
        ],
        responses: {
          200: {
            description: "Sepet kalemleri listesi",
          },
        },
      },
    },
    "/api/v1/items/compare": {
      get: {
        summary: "Çoklu Kalem Fiyat Karşılaştırması",
        description: "Birden fazla mal ve hizmetin zaman içindeki fiyat gelişimini ve kümülatif artış oranını yan yana karşılaştırır.",
        tags: ["Sepet Madde Fiyatları"],
        parameters: [
          {
            name: "items",
            in: "query",
            required: true,
            description: "Karşılaştırılacak ürünlerin slug veya isimleri (virgülle ayrılmış)",
            schema: { type: "string", example: "ekmek,pirinc,benzin" },
          },
          {
            name: "start_period",
            in: "query",
            description: "Başlangıç dönemi (YYYY-MM)",
            schema: { type: "string", example: "2020-01" },
          },
          {
            name: "end_period",
            in: "query",
            description: "Bitiş dönemi (YYYY-MM)",
            schema: { type: "string", example: "2024-01" },
          },
        ],
        responses: {
          200: { description: "Karşılaştırma serisi ve istatistikleri" },
          400: { description: "Eksik parametre" },
        },
      },
    },
    "/api/v1/items/{item}": {
      get: {
        summary: "Tekil Kalem Aylık Fiyat Geçmişi (2015-Günümüz)",
        description: "Belirtilen ürünün (örn: ekmek, benzin, pirinc, dana-eti-taze) 2015 Ocak ayından itibaren tüm aylık fiyatlarını, aylık değişim yüzdelerini, min/max ve toplam artış istatistiklerini getirir.",
        tags: ["Sepet Madde Fiyatları"],
        parameters: [
          {
            name: "item",
            in: "path",
            required: true,
            description: "Ürün ID'si (slug) veya Türkçe adı (örn: ekmek, benzin, eurodizel)",
            schema: { type: "string", example: "ekmek" },
          },
          {
            name: "start_year",
            in: "query",
            description: "Başlangıç yılı (örn: 2020)",
            schema: { type: "integer", example: 2020 },
          },
          {
            name: "end_year",
            in: "query",
            description: "Bitiş yılı (örn: 2024)",
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "sort",
            in: "query",
            description: "Kronolojik sıralama ('asc' veya 'desc')",
            schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
          },
        ],
        responses: {
          200: { description: "Ürünün aylık fiyat serisi ve istatistikleri" },
          404: { description: "Ürün bulunamadı" },
        },
      },
    },
    "/api/v1/prices": {
      get: {
        summary: "Aylık Sepet Fiyat Dökümü",
        description: "Belirtilen ay ve yıla ait tüm sepet kalemlerinin o aydaki fiyatlarını ve bir önceki aya göre değişim oranlarını döndürür.",
        tags: ["Sepet Madde Fiyatları"],
        parameters: [
          {
            name: "period",
            in: "query",
            description: "Dönem (YYYY-MM formatında, örn: 2024-01)",
            schema: { type: "string", example: "2024-01" },
          },
          {
            name: "year",
            in: "query",
            description: "Yıl (örn: 2024)",
            schema: { type: "integer", example: 2024 },
          },
          {
            name: "month",
            in: "query",
            description: "Ay (1-12)",
            schema: { type: "integer", example: 1 },
          },
          {
            name: "search",
            in: "query",
            description: "İlgili ayda ürün adı ile filtreleme",
            schema: { type: "string", example: "et" },
          },
          {
            name: "limit",
            in: "query",
            description: "Döndürülecek kayıt sayısı",
            schema: { type: "integer", default: 50, example: 20 },
          },
        ],
        responses: {
          200: { description: "Aylık sepet fiyat dökümü" },
          404: { description: "Dönem bulunamadı" },
        },
      },
    },
    "/api/v1/stats": {
      get: {
        summary: "API Kullanım İstatistikleri",
        description:
          "API'nin toplam çağrı sayısını, uç nokta bazında kullanım dağılımını ve günlük istek serisini döner. Edge sürümünde sayaç Durable Object üzerinde kalıcıdır; kimlik doğrulaması gerektirmez.",
        tags: ["Sistem"],
        parameters: [
          {
            name: "days",
            in: "query",
            description: "Günlük seride kaç gün döneceği (1-365, varsayılan 30)",
            schema: { type: "integer", default: 30, minimum: 1, maximum: 365 },
          },
        ],
        responses: {
          200: {
            description: "Kullanım istatistikleri",
            content: {
              "application/json": {
                example: {
                  success: true,
                  description:
                    "KKTC TÜFE API toplam çağrı sayısı ve uç nokta bazında kullanım dağılımı",
                  data: {
                    totalRequests: 20,
                    countingSince: "2026-09-04T11:43:26.016Z",
                    endpoints: [
                      { path: "/api/v1/latest", count: 8 },
                      { path: "/api/v1/tufe/:year", count: 5 },
                    ],
                    dailyRequests: [{ day: "2026-09-04", count: 20 }],
                  },
                },
              },
            },
          },
          503: { description: "Sayaç bu ortamda etkin değil" },
        },
      },
    },
    "/api/v1/sync": {
      post: {
        summary: "Manuel Veri Senkronizasyonu Tetikleme",
        description: "KKTC İstatistik Kurumu'ndan en son haber bülteni ve XLS dosyasını manuel tetikleyerek verileri anında tazeler. X-API-Key gerektirir.",
        tags: ["Yönetim"],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: "Senkronizasyon başarılı" },
          401: { description: "Yetkisiz erişim" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Sunucu API Güvenlik Anahtarı. Sunucuda API_KEY ortam değişkeni ile tanımlanır; tanımlı değilse uç nokta 503 döner.",
      },
    },
  },
};
