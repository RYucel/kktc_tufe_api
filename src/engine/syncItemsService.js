import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { config } from "../config.js";
import { parseItemPrices } from "../scripts/parse_items.js";
import { parseItemPricesFromText } from "./csvParser.js";
import { itemsStore } from "./itemsStore.js";

/**
 * CSV metnini karşılaştırma ve saklama için tek biçime indirger.
 *
 * Kaynak depodaki GRETL_TUFE.csv bir Excel çıktısı olduğu için UTF-8 BOM ve
 * CRLF satır sonları taşır; bu depo ise (.gitattributes) LF saklar. Ham metin
 * karşılaştırılırsa içerik hiç değişmemiş olsa bile her senkronizasyon
 * "değişti" sonucu verir ve her gün gereksiz commit + deploy tetiklenir.
 * @param {string} text
 * @returns {string} BOM'suz, LF satır sonlu, tek trailing newline'lı metin
 */
function normalizeCsv(text) {
  return (
    text
      .replace(/^﻿/, "") // UTF-8 BOM
      .replace(/\r\n?/g, "\n") // CRLF ve yalnız CR -> LF
      .replace(/\s+$/, "") + "\n"
  );
}

/**
 * İndirilen CSV'yi diske yazmadan önce mantıksal olarak doğrular.
 * CSV depoya elle yüklendiği için hatalı/eksik bir dosyanın sessizce
 * canlı veriyi ezmesini engeller.
 * @param {{periods: string[], items: object[]}} payload Yeni ayrıştırılmış veri
 * @param {object|null} prevMeta Mevcut (yerel) veri özeti
 */
function assertPayloadIsSane(payload, prevMeta) {
  const itemCount = payload.items.length;
  const periodCount = payload.periods.length;

  if (itemCount === 0 || periodCount === 0) {
    throw new Error("İndirilen CSV ayrıştırıldı fakat hiç kalem/dönem içermiyor.");
  }

  const lastPeriod = payload.periods[periodCount - 1];
  if (!/^\d{4}-\d{2}$/.test(lastPeriod)) {
    throw new Error(`Son dönem etiketi geçersiz formatta: "${lastPeriod}" (beklenen: YYYY-MM).`);
  }

  if (!prevMeta) return;

  // Kalem sayısı %10'dan fazla düşemez (sütun kaybı / bozuk başlık satırı belirtisi)
  const minItems = Math.floor(prevMeta.totalItems * 0.9);
  if (itemCount < minItems) {
    throw new Error(
      `Kalem sayısı beklenmedik şekilde düştü: ${prevMeta.totalItems} -> ${itemCount} ` +
        `(alt sınır: ${minItems}). Güncelleme iptal edildi, yerel veri korundu.`
    );
  }

  // Zaman serisi yalnızca ileriye doğru büyür; kısalması veri kaybıdır
  if (periodCount < prevMeta.totalMonths) {
    throw new Error(
      `Dönem sayısı geriledi: ${prevMeta.totalMonths} -> ${periodCount} ay. ` +
        `Güncelleme iptal edildi, yerel veri korundu.`
    );
  }

  if (prevMeta.endPeriod && lastPeriod < prevMeta.endPeriod) {
    throw new Error(
      `İndirilen CSV mevcut veriden eski: ${lastPeriod} < ${prevMeta.endPeriod}. ` +
        `Güncelleme iptal edildi, yerel veri korundu.`
    );
  }
}

/**
 * GitHub deposundan güncel GRETL_TUFE.csv dosyasını çeker ve yerel veri tabanını günceller.
 */
export async function syncItemsFromGithub() {
  const url = config.sources.githubItemsCsvUrl;
  console.log(`[ItemsSync] GitHub deposundan sepet CSV'si indiriliyor: ${url}`);

  const res = await fetch(url, {
    headers: { "User-Agent": config.sources.userAgent },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`GitHub'dan CSV indirilemedi (HTTP ${res.status}): ${url}`);
  }

  const rawCsv = await res.text();

  if (!rawCsv || rawCsv.trim().length === 0) {
    throw new Error("GitHub'dan indirilen CSV içeriği boş.");
  }

  // BOM/CRLF farklarının sahte "değişiklik" üretmesini engeller
  const newCsvContent = normalizeCsv(rawCsv);
  const prevMeta = itemsStore.getMeta();

  let isDifferent = true;
  if (existsSync(config.paths.itemsCsvFile)) {
    const existingContent = normalizeCsv(readFileSync(config.paths.itemsCsvFile, "utf-8"));
    isDifferent = existingContent !== newCsvContent;
  }

  if (!isDifferent) {
    console.log("[ItemsSync] Yerel sepet verisi GitHub ile birebir aynı, güncelleme gerekmiyor.");
    return {
      changed: false,
      itemCount: prevMeta?.totalItems ?? 0,
      periodCount: prevMeta?.totalMonths ?? 0,
      startPeriod: prevMeta?.startPeriod ?? null,
      endPeriod: prevMeta?.endPeriod ?? null,
    };
  }

  console.log("[ItemsSync] GitHub'da yeni/değişen sepet verisi tespit edildi. Doğrulanıyor...");

  // Diske yazmadan önce hafızada ayrıştır ve doğrula
  const { payload: candidate } = parseItemPricesFromText(newCsvContent);
  assertPayloadIsSane(candidate, prevMeta);

  console.log(
    `[ItemsSync] Doğrulama başarılı (${candidate.items.length} kalem, ` +
      `${candidate.periods.length} ay, son dönem: ${candidate.periods[candidate.periods.length - 1]}). Yazılıyor...`
  );

  writeFileSync(config.paths.itemsCsvFile, newCsvContent, "utf-8");

  // JSON matrislerini yeniden derle (data/items_data.json + data/items_meta.json)
  const { payload, meta } = parseItemPrices(config.paths.itemsCsvFile);

  // itemsStore hafızasını yenile
  await itemsStore.init(payload, meta);

  return {
    changed: true,
    itemCount: payload.items.length,
    periodCount: payload.periods.length,
    startPeriod: meta.startPeriod,
    endPeriod: meta.endPeriod,
    previousEndPeriod: prevMeta?.endPeriod ?? null,
  };
}
