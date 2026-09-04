/**
 * Her iki çalışma zamanının (Node/Express ve Cloudflare Workers) paylaştığı
 * sabitler.
 *
 * Bu dosya bilerek bağımlılıksızdır ve Node'a özgü modül kullanmaz; böylece
 * Edge bundle'ına da sorunsuz girer. Sürüm ve kaynak bilgisi burada tek yerde
 * tutulur, iki runtime'ın birbirinden sapması engellenir.
 */

export const API_VERSION = "1.1.0";

export const OFFICIAL_SOURCE = "KKTC Başbakanlık İstatistik Kurumu";

export const SOURCE_RSS_URL =
  "https://istatistik.gov.ct.tr/HABERLER/rss/category/4213/haberler";

export const ITEMS_CSV_SOURCE_URL =
  "https://raw.githubusercontent.com/RYucel/kktc_tufe/main/GRETL_TUFE.csv";

// Aylık TÜFE serisi de aynı veri deposundan gelir: kktc_tufe, resmî siteyi
// her gün tarayıp ayrıştırılmış JSON'u yayınlar. Böylece scraper mantığı tek
// yerde yaşar ve dashboard ile API'nin farklı rakam göstermesi imkânsızlaşır.
export const TUFE_JSON_SOURCE_URL =
  "https://raw.githubusercontent.com/RYucel/kktc_tufe/main/docs/data/tufe.json";

export const TUFE_META_SOURCE_URL =
  "https://raw.githubusercontent.com/RYucel/kktc_tufe/main/docs/data/meta.json";

export const UPDATE_SCHEDULE_TEXT =
  "Kaynak veri deposu her gün 15:00 UTC'de kontrol edilir; aylık TÜFE serisi ayın ilk 10 gününde resmi kurumdan tazelenir.";

export const LICENSE = "MIT - Açık Kaynak";
