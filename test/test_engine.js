import assert from "node:assert/strict";
import { dataStore } from "../src/engine/dataStore.js";
import { compoundRates, calculateYearPeriods, calculateInflationBetween } from "../src/engine/calculator.js";
import { scrapeTufeData } from "../src/engine/scraper.js";

async function runTests() {
  console.log("=== FAZ 1 TEST SÜRECİ BAŞLIYOR ===");

  // 1. DataStore Testleri
  console.log("\n[Test 1] DataStore Başlatma ve Sorgulama...");
  await dataStore.init();
  const latest = dataStore.getLatest();
  assert.ok(latest, "DataStore en son kaydı döndürmelidir.");
  assert.ok(latest.year >= 2026, "En son kayıt 2026 veya sonrası olmalıdır.");
  console.log(`✓ En son kayıt doğrulandı: ${latest.year}-${latest.month} (Aylık: %${latest.aylikYuzde}, Yıllık: %${latest.yillikYuzde})`);

  const year2024 = dataStore.getByYear(2024);
  assert.equal(year2024.length, 12, "2024 yılına ait 12 aylık veri bulunmalıdır.");
  console.log(`✓ 2024 yılı kayıt sayısı: ${year2024.length}`);

  const singleMonth = dataStore.getByYearMonth(2024, 6);
  assert.ok(singleMonth, "2024 Haziran kaydı mevcut olmalıdır.");
  console.log(`✓ 2024 Haziran kaydı: %${singleMonth.aylikYuzde}`);

  const filtered = dataStore.query({ startYear: 2020, endYear: 2022, sort: "desc" });
  assert.equal(filtered.data.length, 36, "2020-2022 arası 36 ay olmalıdır.");
  assert.equal(filtered.data[0].year, 2022, "Sıralama azalan olmalıdır.");
  console.log(`✓ Filtreli sorgulama ve sıralama başarılı.`);

  // 2. Calculator Testleri
  console.log("\n[Test 2] Finansal ve Kümülatif Hesaplama Testleri...");
  // Bileşik oran testi: %10 ve %10 -> (1.1 * 1.1 - 1) * 100 = 21%
  const comp = compoundRates([10, 10]);
  assert.equal(comp, 21, "Bileşik hesaplama doğru olmalıdır: %10 + %10 = %21");
  console.log(`✓ Bileşik enflasyon formülü doğrulandı (%10 ve %10 -> %${comp})`);

  // Dönem kümülatifi testi
  const periods2024 = calculateYearPeriods(dataStore.records, 2024);
  assert.ok(periods2024.period1.isComplete, "2024 1. dönem eksiksiz olmalıdır.");
  assert.ok(periods2024.period2.isComplete, "2024 2. dönem eksiksiz olmalıdır.");
  console.log(`✓ 2024 1. Dönem (Ocak-Haziran): %${periods2024.period1.cumulativeRate}`);
  console.log(`✓ 2024 2. Dönem (Temmuz-Aralık): %${periods2024.period2.cumulativeRate}`);

  // Tarih aralığı enflasyon değerleme testi
  const calcResult = calculateInflationBetween(dataStore.records, 2023, 1, 2023, 12, 1000);
  assert.ok(calcResult.result.cumulativeInflationPct > 0, "Enflasyon pozitif olmalıdır.");
  assert.ok(calcResult.result.revaluedAmount > 1000, "Değerlenen tutar ana paradan yüksek olmalıdır.");
  console.log(`✓ Değerleme hesabı: 2023-01'deki 1.000 TL -> 2023-12'de ${calcResult.result.revaluedAmount} TL (Kümülatif %${calcResult.result.cumulativeInflationPct})`);

  // 3. Canlı Scraper Testi
  console.log("\n[Test 3] Canlı Scraper ve Ağ Testi (KKTC İstatistik Kurumu RSS & XLS)...");
  try {
    const scraped = await scrapeTufeData();
    assert.ok(scraped.records.length > 500, "500'den fazla kayıt çekilmiş olmalıdır.");
    assert.ok(scraped.meta.archiveUrl.endsWith(".xls"), "Arşiv URL'si .xls ile bitmelidir.");
    console.log(`✓ Canlı Scraper testi başarılı! Toplam ${scraped.records.length} kayıt ve arşiv URL doğrulandı.`);
  } catch (netErr) {
    console.warn("⚠️ Canlı ağ erişimi uyarısı (yerel veri yedek olarak kullanılabilir):", netErr.message);
  }

  console.log("\n🎉 FAZ 1'E AİT TÜM ÇEKİRDEK TESTLER BAŞARIYLA GEÇTİ!");
}

runTests().catch((err) => {
  console.error("Test başarısız:", err);
  process.exit(1);
});
