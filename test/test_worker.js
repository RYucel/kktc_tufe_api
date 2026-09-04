import assert from "node:assert/strict";
import app from "../src/worker.js";

async function testWorker() {
  console.log("=== CLOUDFLARE WORKER EDGE TESTLERİ BAŞLIYOR ===");

  // 1. Health
  console.log("\n[Test 1] GET /health (Edge)");
  const resHealth = await app.request("/health");
  assert.equal(resHealth.status, 200);
  const jsonHealth = await resHealth.json();
  assert.equal(jsonHealth.platform, "Cloudflare Workers (Edge)");
  console.log(`✓ /health Edge platform doğrulandı.`);

  // 2. Latest
  console.log("\n[Test 2] GET /api/v1/latest");
  const resLatest = await app.request("/api/v1/latest");
  assert.equal(resLatest.status, 200);
  const jsonLatest = await resLatest.json();
  assert.equal(jsonLatest.success, true);
  assert.ok(jsonLatest.data.aylikYuzde !== null);
  console.log(`✓ /api/v1/latest: ${jsonLatest.data.period} Aylık %${jsonLatest.data.aylikYuzde}`);

  // 3. Tufe Query with params
  console.log("\n[Test 3] GET /api/v1/tufe?start_year=2024&limit=3&sort=desc");
  const resTufe = await app.request("/api/v1/tufe?start_year=2024&limit=3&sort=desc");
  assert.equal(resTufe.status, 200);
  const jsonTufe = await resTufe.json();
  assert.equal(jsonTufe.data.length, 3);
  console.log(`✓ /api/v1/tufe filtreleme başarılı.`);

  // 4. Periods
  console.log("\n[Test 4] GET /api/v1/periods?year=2024");
  const resPeriods = await app.request("/api/v1/periods?year=2024");
  assert.equal(resPeriods.status, 200);
  const jsonPeriods = await resPeriods.json();
  assert.ok(jsonPeriods.data.period1.cumulativeRate > 0);
  console.log(`✓ /api/v1/periods: 1. Dönem: %${jsonPeriods.data.period1.cumulativeRate}`);

  // 5. Calculate
  console.log("\n[Test 5] GET /api/v1/calculate");
  const resCalc = await app.request("/api/v1/calculate?start_year=2023&start_month=1&amount=5000");
  assert.equal(resCalc.status, 200);
  const jsonCalc = await resCalc.json();
  assert.ok(jsonCalc.result.revaluedAmount > 5000);
  console.log(`✓ /api/v1/calculate: 5.000 TL -> ${jsonCalc.result.revaluedAmount} TL`);

  // 6. OpenAPI JSON
  console.log("\n[Test 6] GET /api/openapi.json");
  const resOpenApi = await app.request("/api/openapi.json");
  assert.equal(resOpenApi.status, 200);
  const jsonOpenApi = await resOpenApi.json();
  assert.equal(jsonOpenApi.openapi, "3.0.3");
  console.log(`✓ /api/openapi.json OpenAPI 3.0.3 şeması doğrulandı.`);

  // 7. Docs
  console.log("\n[Test 7] GET /docs");
  const resDocs = await app.request("/docs");
  assert.equal(resDocs.status, 200);
  const htmlDocs = await resDocs.text();
  assert.ok(htmlDocs.includes("SwaggerUIBundle"));
  console.log(`✓ /docs Swagger UI Edge HTML doğrulandı.`);

  // 8. Items List on Edge
  console.log("\n[Test 8] GET /api/v1/items (Edge)");
  const resItems = await app.request("/api/v1/items?limit=5");
  assert.equal(resItems.status, 200);
  const jsonItems = await resItems.json();
  assert.equal(jsonItems.success, true);
  assert.equal(jsonItems.total, 520);
  assert.equal(jsonItems.count, 5);
  console.log(`✓ /api/v1/items Edge üzerinde 520 kalem doğrulandı.`);

  // 9. Item Detail (Ekmek) on Edge
  console.log("\n[Test 9] GET /api/v1/items/ekmek (Edge)");
  const resEkmek = await app.request("/api/v1/items/ekmek");
  assert.equal(resEkmek.status, 200);
  const jsonEkmek = await resEkmek.json();
  assert.equal(jsonEkmek.success, true);
  assert.equal(jsonEkmek.data.name, "Ekmek");
  console.log(`✓ /api/v1/items/ekmek Edge üzerinde fiyat serisi: ${jsonEkmek.data.totalMonths} ay.`);

  // 10. Prices by Month on Edge
  console.log("\n[Test 10] GET /api/v1/prices?period=2024-01 (Edge)");
  const resPrices = await app.request("/api/v1/prices?period=2024-01&limit=5");
  assert.equal(resPrices.status, 200);
  const jsonPrices = await resPrices.json();
  assert.equal(jsonPrices.success, true);
  assert.equal(jsonPrices.period, "2024-01");
  console.log(`✓ /api/v1/prices Edge üzerinde 2024-01 sepet fiyatları doğrulandı.`);

  // 11. Compare Items on Edge
  console.log("\n[Test 11] GET /api/v1/items/compare?items=ekmek,pirinc (Edge)");
  const resCompare = await app.request("/api/v1/items/compare?items=ekmek,pirinc");
  assert.equal(resCompare.status, 200);
  const jsonCompare = await resCompare.json();
  assert.equal(jsonCompare.success, true);
  assert.equal(jsonCompare.itemCount, 2);
  console.log(`✓ /api/v1/items/compare Edge üzerinde 2 ürün karşılaştırması başarılı.`);

  console.log("\n🎉 CLOUDFLARE WORKERS TÜM EDGE TESTLERİ BAŞARIYLA GEÇTİ!");
}

testWorker().catch((err) => {
  console.error("Worker Test Hatası:", err);
  process.exit(1);
});
