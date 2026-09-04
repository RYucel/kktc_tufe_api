import { config } from "../config.js";
import { scrapeTufeData } from "./scraper.js";

/**
 * Aylık TÜFE serisinin birincil kaynağı: kktc_tufe veri deposu.
 *
 * kktc_tufe deposu resmî KKTC İstatistik Kurumu sitesini her gün tarayıp
 * ayrıştırılmış tufe.json + meta.json dosyalarını yayınlar. API bu çıktıyı
 * tüketir; böylece scraper mantığı tek yerde yaşar ve dashboard ile API'nin
 * farklı rakam göstermesi mümkün olmaz.
 *
 * Depoya ulaşılamazsa resmî siteyi doğrudan tarayan yedek yola düşülür
 * (scraper.js) — bu yol aynı resmî kaynaktan beslendiği için sapma üretmez,
 * yalnızca kesinti anında API'nin bayatlamasını engeller.
 */

async function fetchJson(url, timeoutMs = 15000) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": config.sources.userAgent,
      // raw.githubusercontent CDN'i eski içerik döndürebiliyor
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} alındı: ${url}`);
  }
  return res.json();
}

/**
 * Gelen kayıt dizisini yapısal olarak doğrular.
 * @param {any} records
 * @param {object|null} prevMeta Mevcut yerel meta (varsa)
 */
export function assertRecordsAreSane(records, prevMeta) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("TÜFE kaynağı boş veya dizi değil.");
  }

  for (const r of records.slice(0, 5).concat(records.slice(-5))) {
    if (
      !Number.isInteger(r?.year) ||
      !Number.isInteger(r?.month) ||
      r.month < 1 ||
      r.month > 12
    ) {
      throw new Error(`Geçersiz kayıt yapısı: ${JSON.stringify(r)}`);
    }
  }

  const last = records[records.length - 1];
  const endPeriod = `${last.year}-${String(last.month).padStart(2, "0")}`;

  if (prevMeta?.recordCount && records.length < prevMeta.recordCount) {
    throw new Error(
      `Kayıt sayısı geriledi: ${prevMeta.recordCount} -> ${records.length}. ` +
        `Güncelleme iptal edildi, yerel veri korundu.`
    );
  }

  if (prevMeta?.endPeriod && endPeriod < prevMeta.endPeriod) {
    throw new Error(
      `Kaynak mevcut veriden eski: ${endPeriod} < ${prevMeta.endPeriod}. ` +
        `Güncelleme iptal edildi, yerel veri korundu.`
    );
  }

  return endPeriod;
}

/**
 * TÜFE serisini kktc_tufe deposundan çeker; başarısız olursa resmî siteyi tarar.
 * @param {object|null} prevMeta Doğrulama için mevcut yerel meta
 * @returns {Promise<{records: Array, meta: object}>}
 */
export async function fetchTufeData(prevMeta = null) {
  try {
    console.log(`[TufeSource] Veri deposundan çekiliyor: ${config.sources.githubTufeJsonUrl}`);

    const [records, repoMeta] = await Promise.all([
      fetchJson(config.sources.githubTufeJsonUrl),
      fetchJson(config.sources.githubTufeMetaUrl).catch(() => ({})),
    ]);

    const endPeriod = assertRecordsAreSane(records, prevMeta);
    const first = records[0];

    console.log(`[TufeSource] Doğrulandı: ${records.length} kayıt, son dönem ${endPeriod}.`);

    return {
      records,
      meta: {
        ...repoMeta,
        lastChecked: new Date().toISOString(),
        recordCount: records.length,
        startPeriod: `${first.year}-${String(first.month).padStart(2, "0")}`,
        endPeriod,
        dataSource: "kktc_tufe veri deposu (github.com/RYucel/kktc_tufe)",
      },
    };
  } catch (err) {
    console.warn(`[TufeSource] Veri deposu okunamadı (${err.message}). Resmî siteye düşülüyor...`);

    const { records, meta } = await scrapeTufeData();
    assertRecordsAreSane(records, prevMeta);

    return {
      records,
      meta: {
        ...meta,
        dataSource: "Resmî KKTC İstatistik Kurumu (yedek yol: doğrudan tarama)",
      },
    };
  }
}
