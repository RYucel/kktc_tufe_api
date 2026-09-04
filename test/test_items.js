import assert from "node:assert/strict";
import { dataStore } from "../src/engine/dataStore.js";
import { itemsStore } from "../src/engine/itemsStore.js";
import { createApp } from "../src/api/app.js";

export async function runItemsTests() {
  console.log("\n=== SEPET MADDE FİYATLARI API TESTLERİ BAŞLIYOR ===");

  await dataStore.init();
  await itemsStore.init();
  const app = createApp();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test sunucusu çalışıyor: ${baseUrl}`);

  try {
    // 1. Items List
    console.log("\n[Test 1] GET /api/v1/items?limit=10");
    const resItems = await fetch(`${baseUrl}/api/v1/items?limit=10`);
    assert.equal(resItems.status, 200);
    const jsonItems = await resItems.json();
    assert.equal(jsonItems.success, true);
    assert.equal(jsonItems.total, 520);
    assert.equal(jsonItems.count, 10);
    assert.ok(jsonItems.data[0].id);
    assert.ok(jsonItems.data[0].name);
    assert.ok(jsonItems.data[0].latestPrice > 0);
    console.log(`✓ /api/v1/items OK: Toplam 520 kalemden 10 tanesi çekildi. İlk ürün: ${jsonItems.data[0].name} (${jsonItems.data[0].latestPrice} TL)`);

    // 2. Search Item
    console.log("\n[Test 2] GET /api/v1/items?search=ekmek");
    const resSearch = await fetch(`${baseUrl}/api/v1/items?search=ekmek`);
    assert.equal(resSearch.status, 200);
    const jsonSearch = await resSearch.json();
    assert.equal(jsonSearch.success, true);
    assert.ok(jsonSearch.count >= 1);
    const hasEkmek = jsonSearch.data.some((it) => it.id.includes("ekmek") || it.name.toLowerCase().includes("ekmek"));
    assert.equal(hasEkmek, true);
    console.log(`✓ /api/v1/items?search=ekmek OK: ${jsonSearch.count} eşleşen ürün bulundu.`);

    // 3. Single Item History (Ekmek)
    console.log("\n[Test 3] GET /api/v1/items/ekmek");
    const resEkmek = await fetch(`${baseUrl}/api/v1/items/ekmek`);
    assert.equal(resEkmek.status, 200);
    const jsonEkmek = await resEkmek.json();
    assert.equal(jsonEkmek.success, true);
    assert.equal(jsonEkmek.data.id, "ekmek");
    assert.equal(jsonEkmek.data.name, "Ekmek");
    assert.ok(jsonEkmek.data.totalMonths >= 100);
    assert.ok(jsonEkmek.data.statistics.firstPrice > 0);
    assert.ok(jsonEkmek.data.statistics.latestPrice > jsonEkmek.data.statistics.firstPrice);
    assert.ok(Array.isArray(jsonEkmek.data.history));
    console.log(`✓ /api/v1/items/ekmek OK: İlk Fiyat: ${jsonEkmek.data.statistics.firstPrice} TL -> Son Fiyat: ${jsonEkmek.data.statistics.latestPrice} TL (Artış: %${jsonEkmek.data.statistics.totalChangePercentage})`);

    // 4. Single Item History with Year Filter (Benzin)
    console.log("\n[Test 4] GET /api/v1/items/benzin?start_year=2020&end_year=2023");
    const resBenzin = await fetch(`${baseUrl}/api/v1/items/benzin?start_year=2020&end_year=2023`);
    assert.equal(resBenzin.status, 200);
    const jsonBenzin = await resBenzin.json();
    assert.equal(jsonBenzin.success, true);
    assert.ok(jsonBenzin.data.startPeriod.startsWith("2020"));
    assert.ok(jsonBenzin.data.endPeriod.startsWith("2023"));
    console.log(`✓ /api/v1/items/benzin Filtreli OK: Dönem ${jsonBenzin.data.startPeriod} - ${jsonBenzin.data.endPeriod}`);

    // 5. Prices by Period
    console.log("\n[Test 5] GET /api/v1/prices?period=2024-01&limit=20");
    const resPrices = await fetch(`${baseUrl}/api/v1/prices?period=2024-01&limit=20`);
    assert.equal(resPrices.status, 200);
    const jsonPrices = await resPrices.json();
    assert.equal(jsonPrices.success, true);
    assert.equal(jsonPrices.period, "2024-01");
    assert.equal(jsonPrices.total, 520);
    assert.equal(jsonPrices.count, 20);
    console.log(`✓ /api/v1/prices OK: 2024-01 sepeti 520 ürün içeriyor.`);

    // 6. Compare Items
    console.log("\n[Test 6] GET /api/v1/items/compare?items=ekmek,pirinc,benzin");
    const resCompare = await fetch(`${baseUrl}/api/v1/items/compare?items=ekmek,pirinc,benzin`);
    assert.equal(resCompare.status, 200);
    const jsonCompare = await resCompare.json();
    assert.equal(jsonCompare.success, true);
    assert.equal(jsonCompare.itemCount, 3);
    assert.equal(jsonCompare.data[0].id, "ekmek");
    assert.equal(jsonCompare.data[1].id, "pirinc");
    assert.equal(jsonCompare.data[2].id, "benzin");
    console.log(`✓ /api/v1/items/compare OK: 3 ürün yan yana karşılaştırıldı.`);

    // 7. Non-existing item
    console.log("\n[Test 7] GET /api/v1/items/olmayan-madde-xyz");
    const res404 = await fetch(`${baseUrl}/api/v1/items/olmayan-madde-xyz`);
    assert.equal(res404.status, 404);
    const json404 = await res404.json();
    assert.equal(json404.success, false);
    console.log(`✓ /api/v1/items/:item (404) OK.`);

    console.log("\n🎉 TÜM SEPET MADDE FİYATLARI TESTLERİ BAŞARIYLA GEÇTİ!");
  } finally {
    server.close();
  }
}

if (process.argv[1]?.endsWith("test_items.js")) {
  runItemsTests().catch((err) => {
    console.error("Test hatası:", err);
    process.exit(1);
  });
}
