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

export const UPDATE_SCHEDULE_TEXT =
  "Resmi TÜFE bülteni ve sepet madde fiyatları her gün 09:00 UTC'de otomatik kontrol edilir.";

export const LICENSE = "MIT - Açık Kaynak";
